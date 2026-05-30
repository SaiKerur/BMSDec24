package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.PaymentResponseDto;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.PaymentAlreadyProcessedException;
import org.example.bmsdec24.exceptions.SomeOrAllSeatsAreUnavailable;
import org.example.bmsdec24.exceptions.TicketAlreadyProcessedException;
import org.example.bmsdec24.models.Payment;
import org.example.bmsdec24.models.PaymentProvider;
import org.example.bmsdec24.models.PaymentStatus;
import org.example.bmsdec24.models.SeatTypeShow;
import org.example.bmsdec24.models.ShowSeat;
import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.models.TicketStatus;
import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;
import org.example.bmsdec24.payments.PaymentGateway;
import org.example.bmsdec24.payments.PaymentGatewayFactory;
import org.example.bmsdec24.repos.PaymentRepository;
import org.example.bmsdec24.repos.SeatTypeShowRepository;
import org.example.bmsdec24.repos.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final String DEFAULT_CURRENCY = "INR";
    private static final double DEFAULT_SEAT_PRICE = 199.0;

    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final SeatTypeShowRepository seatTypeShowRepository;
    private final PaymentGatewayFactory paymentGatewayFactory;
    private final TicketService ticketService;

    public PaymentServiceImpl(PaymentRepository paymentRepository,
                              TicketRepository ticketRepository,
                              SeatTypeShowRepository seatTypeShowRepository,
                              PaymentGatewayFactory paymentGatewayFactory,
                              TicketService ticketService) {
        this.paymentRepository = paymentRepository;
        this.ticketRepository = ticketRepository;
        this.seatTypeShowRepository = seatTypeShowRepository;
        this.paymentGatewayFactory = paymentGatewayFactory;
        this.ticketService = ticketService;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public PaymentResponseDto initiatePayment(int ticketId, PaymentProvider provider)
            throws InvalidTicketException, InvalidPaymentException {
        if (provider == null) {
            throw new InvalidPaymentException("A payment provider (STRIPE or RAZORPAY) is required");
        }

        Ticket ticket = ticketRepository.findDetailedById(ticketId)
                .orElseThrow(() -> new InvalidTicketException("Ticket not found"));

        if (ticket.getStatus() != TicketStatus.PENDING) {
            throw new InvalidPaymentException("Only PENDING tickets can be paid. Current status: " + ticket.getStatus());
        }
        if (ticket.getHoldExpiresAt() != null && ticket.getHoldExpiresAt().before(new Date())) {
            throw new InvalidPaymentException("Ticket hold has expired. Please re-book the seats.");
        }

        double amount = computeAmount(ticket);

        PaymentGateway gateway = paymentGatewayFactory.getGateway(provider);
        GatewayChargeRequest chargeRequest = new GatewayChargeRequest(
                ticket.getId(),
                amount,
                DEFAULT_CURRENCY,
                ticket.getUser() == null ? null : ticket.getUser().getEmail());
        GatewayOrder order = gateway.createOrder(chargeRequest);

        Payment payment = new Payment();
        payment.setTicket(ticket);
        payment.setProvider(provider);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(amount);
        payment.setCurrency(DEFAULT_CURRENCY);
        payment.setGatewayOrderId(order.getOrderId());
        payment = paymentRepository.save(payment);

        PaymentResponseDto response = PaymentResponseDto.from(payment);
        response.setCheckoutUrl(order.getCheckoutUrl());
        response.setClientSecret(order.getClientSecret());
        return response;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public PaymentResponseDto completePayment(int paymentId, String paymentReference, String signature, boolean reportedSuccess)
            throws InvalidPaymentException, PaymentAlreadyProcessedException {
        Payment payment = paymentRepository.findDetailedById(paymentId)
                .orElseThrow(() -> new InvalidPaymentException("Payment not found"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new PaymentAlreadyProcessedException("Payment is already " + payment.getStatus());
        }

        Ticket ticket = payment.getTicket();
        if (ticket == null) {
            throw new InvalidPaymentException("Payment is not linked to a ticket");
        }

        PaymentGateway gateway = paymentGatewayFactory.getGateway(payment.getProvider());
        GatewayVerificationResult verification = gateway.verify(
                new GatewayVerificationRequest(payment.getGatewayOrderId(), paymentReference, signature, reportedSuccess));

        payment.setGatewayPaymentReference(verification.getPaymentReference());

        if (verification.isSuccess()) {
            settleAsSuccess(payment, ticket);
        } else {
            settleAsFailure(payment, ticket, verification.getFailureReason());
        }

        Payment saved = paymentRepository.save(payment);
        return PaymentResponseDto.from(saved);
    }

    @Transactional(readOnly = true)
    @Override
    public PaymentResponseDto getPayment(int paymentId) throws InvalidPaymentException {
        Payment payment = paymentRepository.findDetailedById(paymentId)
                .orElseThrow(() -> new InvalidPaymentException("Payment not found"));
        return PaymentResponseDto.from(payment);
    }

    private void settleAsSuccess(Payment payment, Ticket ticket) {
        try {
            ticketService.confirmTicket(ticket.getId());
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setFailureReason(null);
            payment.setTicket(reloadTicket(ticket.getId()));
        } catch (TicketAlreadyProcessedException | SomeOrAllSeatsAreUnavailable | InvalidTicketException e) {
            // Payment cleared but the booking could no longer be confirmed (e.g. hold
            // expired and seats were released). Treat the payment as failed so it can
            // be refunded, and ensure the ticket ends up cancelled.
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Could not confirm booking after payment: " + e.getMessage());
            safeCancelTicket(ticket.getId());
            payment.setTicket(reloadTicket(ticket.getId()));
        }
    }

    private void settleAsFailure(Payment payment, Ticket ticket, String failureReason) {
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(failureReason);
        safeCancelTicket(ticket.getId());
        payment.setTicket(reloadTicket(ticket.getId()));
    }

    private void safeCancelTicket(int ticketId) {
        try {
            ticketService.cancelTicket(ticketId);
        } catch (InvalidTicketException ignored) {
            // Ticket disappeared; nothing else to release.
        }
    }

    private Ticket reloadTicket(int ticketId) {
        return ticketRepository.findDetailedById(ticketId).orElse(null);
    }

    private double computeAmount(Ticket ticket) {
        int showId = ticket.getShow().getId();
        double total = 0.0;
        for (ShowSeat showSeat : ticket.getShowSeats()) {
            total += seatTypeShowRepository
                    .findByShow_IdAndSeatType(showId, showSeat.getSeat().getSeatType())
                    .map(SeatTypeShow::getPrice)
                    .orElse(DEFAULT_SEAT_PRICE);
        }
        return total;
    }
}
