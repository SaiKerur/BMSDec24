package org.example.bmsdec24.services;

import org.example.bmsdec24.config.PaymentProperties;
import org.example.bmsdec24.dtos.PaymentProviderOptionDto;
import org.example.bmsdec24.dtos.PaymentResponseDto;
import org.example.bmsdec24.dtos.TicketSummaryDto;
import org.example.bmsdec24.dtos.WebhookResponseDto;
import org.example.bmsdec24.exceptions.BookingAlreadyProcessedException;
import org.example.bmsdec24.exceptions.PaymentGatewayException;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.PaymentAlreadyProcessedException;
import org.example.bmsdec24.exceptions.SeatsNotAvailableException;
import org.example.bmsdec24.exceptions.TicketNotFoundException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.Payment;
import org.example.bmsdec24.models.PaymentGatewayEvent;
import org.example.bmsdec24.models.PaymentProvider;
import org.example.bmsdec24.models.PaymentStatus;
import org.example.bmsdec24.models.WebhookProcessingOutcome;
import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayWebhookPayload;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;
import org.example.bmsdec24.payments.PaymentGateway;
import org.example.bmsdec24.payments.PaymentGatewayFactory;
import org.example.bmsdec24.repos.BookingRepository;
import org.example.bmsdec24.repos.PaymentGatewayEventRepository;
import org.example.bmsdec24.repos.PaymentRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final String DEFAULT_CURRENCY = "INR";

    private final PaymentRepository paymentRepository;
    private final PaymentGatewayEventRepository paymentGatewayEventRepository;
    private final BookingRepository bookingRepository;
    private final PaymentGatewayFactory paymentGatewayFactory;
    private final BookingService bookingService;
    private final TicketService ticketService;
    private final PaymentProperties paymentProperties;

    public PaymentServiceImpl(PaymentRepository paymentRepository,
                              PaymentGatewayEventRepository paymentGatewayEventRepository,
                              BookingRepository bookingRepository,
                              PaymentGatewayFactory paymentGatewayFactory,
                              BookingService bookingService,
                              TicketService ticketService,
                              PaymentProperties paymentProperties) {
        this.paymentRepository = paymentRepository;
        this.paymentGatewayEventRepository = paymentGatewayEventRepository;
        this.bookingRepository = bookingRepository;
        this.paymentGatewayFactory = paymentGatewayFactory;
        this.bookingService = bookingService;
        this.ticketService = ticketService;
        this.paymentProperties = paymentProperties;
    }

    @Override
    public List<PaymentProviderOptionDto> listAvailableProviders() {
        boolean mock = paymentProperties.isMockEnabled();
        return List.of(
                new PaymentProviderOptionDto(
                        PaymentProvider.STRIPE,
                        "Stripe",
                        mock || paymentProperties.getStripe().isConfigured()),
                new PaymentProviderOptionDto(
                        PaymentProvider.RAZORPAY,
                        "Razorpay",
                        mock || paymentProperties.getRazorpay().isConfigured()));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public PaymentResponseDto initiatePayment(int bookingId, PaymentProvider provider)
            throws InvalidPaymentException {
        if (provider == null) {
            throw new InvalidPaymentException("A payment provider (STRIPE or RAZORPAY) is required");
        }

        Booking booking = bookingRepository.findDetailedById(bookingId)
                .orElseThrow(() -> new InvalidPaymentException("No booking found with id: " + bookingId));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidPaymentException(
                    "Only PENDING bookings can be paid. Booking " + bookingId + " is " + booking.getStatus()
                            + ". Create a new booking with POST /api/bookings/book.");
        }

        Date now = new Date();
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().before(now)) {
            safeCancelBooking(bookingId);
            throw new InvalidPaymentException(
                    "Booking hold has expired for booking " + bookingId + ". Please book seats again.");
        }

        Optional<Payment> existingPayment = paymentRepository.findFirstByBooking_IdAndStatus(
                bookingId, PaymentStatus.PENDING);
        if (existingPayment.isPresent()) {
            throw new InvalidPaymentException(
                    "Payment already initiated for booking " + bookingId
                            + ". Use paymentId " + existingPayment.get().getId()
                            + " in POST /api/payments/callback, or book again.");
        }

        PaymentGateway gateway = paymentGatewayFactory.getGateway(provider);
        GatewayChargeRequest chargeRequest = new GatewayChargeRequest(
                booking.getId(),
                booking.getTotalAmount(),
                DEFAULT_CURRENCY,
                booking.getUser() == null ? null : booking.getUser().getEmail());
        GatewayOrder order;
        try {
            order = gateway.createOrder(chargeRequest);
        } catch (PaymentGatewayException e) {
            throw new InvalidPaymentException("Payment gateway error: " + e.getMessage());
        }

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setProvider(provider);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(booking.getTotalAmount());
        payment.setCurrency(DEFAULT_CURRENCY);
        payment.setGatewayOrderId(order.getOrderId());
        payment = paymentRepository.save(payment);

        PaymentResponseDto response = PaymentResponseDto.from(payment);
        response.setCheckoutUrl(order.getCheckoutUrl());
        response.setClientSecret(order.getClientSecret());
        response.setPublishableKey(order.getPublishableKey());
        return response;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public PaymentResponseDto completePayment(int paymentId, String paymentReference, String signature, boolean reportedSuccess)
            throws InvalidPaymentException, PaymentAlreadyProcessedException {
        Payment payment = paymentRepository.findDetailedById(paymentId)
                .orElseThrow(() -> new InvalidPaymentException("No payment found with id: " + paymentId));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new PaymentAlreadyProcessedException(
                    "Payment " + paymentId + " is already " + payment.getStatus() + " and cannot be updated");
        }

        Booking booking = payment.getBooking();
        if (booking == null) {
            throw new InvalidPaymentException("Payment " + paymentId + " is not linked to any booking");
        }

        PaymentGateway gateway = paymentGatewayFactory.getGateway(payment.getProvider());
        GatewayVerificationResult verification;
        try {
            verification = gateway.verify(
                    new GatewayVerificationRequest(payment.getGatewayOrderId(), paymentReference, signature, reportedSuccess));
        } catch (PaymentGatewayException e) {
            throw new InvalidPaymentException("Payment gateway error: " + e.getMessage());
        }

        payment.setGatewayPaymentReference(verification.getPaymentReference());

        if (verification.isSuccess()) {
            settleAsSuccess(payment, booking);
        } else {
            settleAsFailure(payment, booking, verification.getFailureReason());
        }

        return toPaymentResponse(paymentRepository.save(payment));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public WebhookResponseDto processGatewayWebhook(PaymentProvider provider, GatewayWebhookPayload payload) {
        if (paymentGatewayEventRepository.existsByGatewayEventId(payload.getGatewayEventId())) {
            Payment payment = paymentGatewayEventRepository.findByGatewayEventId(payload.getGatewayEventId())
                    .map(PaymentGatewayEvent::getPayment)
                    .map(stored -> paymentRepository.findDetailedById(stored.getId()).orElse(stored))
                    .orElse(null);
            return buildWebhookResponse(payload, WebhookProcessingOutcome.ALREADY_PROCESSED, payment);
        }

        if (!payload.isActionable()) {
            recordGatewayEvent(provider, payload, null, WebhookProcessingOutcome.IGNORED);
            return buildWebhookResponse(payload, WebhookProcessingOutcome.IGNORED, null);
        }

        Payment payment = paymentRepository.findDetailedByGatewayOrderId(payload.getGatewayOrderId())
                .orElse(null);
        if (payment == null) {
            recordGatewayEvent(provider, payload, null, WebhookProcessingOutcome.PAYMENT_NOT_FOUND);
            return buildWebhookResponse(payload, WebhookProcessingOutcome.PAYMENT_NOT_FOUND, null);
        }

        if (payment.getProvider() != provider) {
            recordGatewayEvent(provider, payload, payment, WebhookProcessingOutcome.IGNORED);
            return buildWebhookResponse(payload, WebhookProcessingOutcome.IGNORED, payment);
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            recordGatewayEvent(provider, payload, payment, WebhookProcessingOutcome.ALREADY_PROCESSED);
            return buildWebhookResponse(payload, WebhookProcessingOutcome.ALREADY_PROCESSED, payment);
        }

        payment.setGatewayPaymentReference(payload.getPaymentReference());
        if (payload.isPaymentSucceeded()) {
            settleAsSuccess(payment, payment.getBooking());
        } else {
            settleAsFailure(payment, payment.getBooking(), payload.getFailureReason());
        }
        payment = paymentRepository.save(payment);
        recordGatewayEvent(provider, payload, payment, WebhookProcessingOutcome.PROCESSED);
        return buildWebhookResponse(payload, WebhookProcessingOutcome.PROCESSED, payment);
    }

    @Transactional(readOnly = true)
    @Override
    public PaymentResponseDto getPayment(int paymentId) throws InvalidPaymentException {
        Payment payment = paymentRepository.findDetailedById(paymentId)
                .orElseThrow(() -> new InvalidPaymentException("No payment found with id: " + paymentId));
        return toPaymentResponse(payment);
    }

    private void settleAsSuccess(Payment payment, Booking booking) {
        try {
            bookingService.confirmBooking(booking.getId());
            issueTicketSafely(booking.getId());
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setFailureReason(null);
            payment.setBooking(reloadBooking(booking.getId()));
        } catch (BookingAlreadyProcessedException | SeatsNotAvailableException | InvalidBookingException e) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Could not confirm booking after payment: " + e.getMessage());
            safeCancelBooking(booking.getId());
            payment.setBooking(reloadBooking(booking.getId()));
        }
    }

    private void settleAsFailure(Payment payment, Booking booking, String failureReason) {
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(failureReason);
        safeCancelBooking(booking.getId());
        payment.setBooking(reloadBooking(booking.getId()));
    }

    private void safeCancelBooking(int bookingId) {
        try {
            bookingService.cancelBooking(bookingId);
        } catch (InvalidBookingException ignored) {
        }
    }

    private Booking reloadBooking(int bookingId) {
        return bookingRepository.findDetailedById(bookingId).orElse(null);
    }

    private void issueTicketSafely(int bookingId) {
        try {
            ticketService.issueTicket(bookingId);
        } catch (InvalidTicketException ignored) {
        }
    }

    private PaymentResponseDto toPaymentResponse(Payment payment) {
        PaymentResponseDto response = PaymentResponseDto.from(payment);
        if (payment.getStatus() == PaymentStatus.SUCCESS && payment.getBooking() != null) {
            attachTicketSummary(response, payment.getBooking().getId());
        }
        return response;
    }

    private void attachTicketSummary(PaymentResponseDto response, int bookingId) {
        try {
            response.setTicket(TicketSummaryDto.from(ticketService.getTicketForBooking(bookingId)));
        } catch (TicketNotFoundException ignored) {
        }
    }

    private void recordGatewayEvent(PaymentProvider provider,
                                    GatewayWebhookPayload payload,
                                    Payment payment,
                                    WebhookProcessingOutcome outcome) {
        PaymentGatewayEvent event = new PaymentGatewayEvent();
        event.setGatewayEventId(payload.getGatewayEventId());
        event.setProvider(provider);
        event.setEventType(payload.getEventType());
        event.setPayment(payment);
        event.setOutcome(outcome);
        event.setGatewayOrderId(payload.getGatewayOrderId());
        try {
            paymentGatewayEventRepository.save(event);
        } catch (DataIntegrityViolationException ignored) {
            // Concurrent duplicate delivery — unique constraint on gatewayEventId
        }
    }

    private WebhookResponseDto buildWebhookResponse(GatewayWebhookPayload payload,
                                                    WebhookProcessingOutcome outcome,
                                                    Payment payment) {
        WebhookResponseDto response = new WebhookResponseDto();
        response.setGatewayEventId(payload.getGatewayEventId());
        response.setEventType(payload.getEventType());
        response.setOutcome(outcome);
        if (payment != null) {
            response.setPaymentId(payment.getId());
            response.setPaymentStatus(payment.getStatus() == null ? null : payment.getStatus().name());
            if (payment.getBooking() != null && payment.getBooking().getStatus() != null) {
                response.setBookingStatus(payment.getBooking().getStatus().name());
            }
        }
        return response;
    }
}
