package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.RefundResponseDto;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidRefundException;
import org.example.bmsdec24.exceptions.RefundAlreadyProcessedException;
import org.example.bmsdec24.exceptions.RefundNotAllowedException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.Payment;
import org.example.bmsdec24.models.PaymentStatus;
import org.example.bmsdec24.models.Refund;
import org.example.bmsdec24.models.RefundStatus;
import org.example.bmsdec24.payments.GatewayRefundRequest;
import org.example.bmsdec24.payments.GatewayRefundResult;
import org.example.bmsdec24.payments.PaymentGateway;
import org.example.bmsdec24.payments.PaymentGatewayFactory;
import org.example.bmsdec24.repos.BookingRepository;
import org.example.bmsdec24.repos.PaymentRepository;
import org.example.bmsdec24.repos.RefundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefundServiceImpl implements RefundService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final CancellationPolicyService cancellationPolicyService;
    private final PaymentGatewayFactory paymentGatewayFactory;
    private final BookingService bookingService;

    public RefundServiceImpl(BookingRepository bookingRepository,
                             PaymentRepository paymentRepository,
                             RefundRepository refundRepository,
                             CancellationPolicyService cancellationPolicyService,
                             PaymentGatewayFactory paymentGatewayFactory,
                             BookingService bookingService) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.cancellationPolicyService = cancellationPolicyService;
        this.paymentGatewayFactory = paymentGatewayFactory;
        this.bookingService = bookingService;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public RefundResponseDto processRefund(int bookingId, String reason)
            throws InvalidRefundException, RefundNotAllowedException, RefundAlreadyProcessedException {
        Booking booking = bookingRepository.findDetailedById(bookingId)
                .orElseThrow(() -> new InvalidRefundException("No booking found with id: " + bookingId));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            Refund existing = refundRepository.findFirstByBooking_IdAndStatus(bookingId, RefundStatus.SUCCESS)
                    .or(() -> refundRepository.findFirstByBooking_IdAndStatus(bookingId, RefundStatus.SKIPPED))
                    .orElse(null);
            if (existing != null) {
                return RefundResponseDto.from(refundRepository.findDetailedById(existing.getId()).orElse(existing));
            }
            Payment successPayment = paymentRepository.findFirstByBooking_IdAndStatus(bookingId, PaymentStatus.SUCCESS)
                    .orElse(null);
            if (successPayment == null) {
                throw new RefundAlreadyProcessedException(
                        "Booking " + bookingId + " is already cancelled and has no refundable payment");
            }
            return processPaymentRefund(booking, successPayment, reason, false);
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RefundNotAllowedException(
                    "Only CONFIRMED paid bookings can be refunded. Booking " + bookingId + " is "
                            + booking.getStatus());
        }

        if (refundRepository.existsByBooking_IdAndStatus(bookingId, RefundStatus.SUCCESS)
                || refundRepository.existsByBooking_IdAndStatus(bookingId, RefundStatus.PENDING)) {
            throw new RefundAlreadyProcessedException("A refund has already been initiated for booking " + bookingId);
        }

        Payment payment = paymentRepository.findFirstByBooking_IdAndStatus(bookingId, PaymentStatus.SUCCESS)
                .orElseThrow(() -> new RefundNotAllowedException(
                        "No successful payment found for booking " + bookingId + ". Refund is not applicable."));

        return processPaymentRefund(booking, payment, reason, true);
    }

    private RefundResponseDto processPaymentRefund(Booking booking, Payment payment, String reason, boolean cancelBooking)
            throws RefundNotAllowedException, InvalidRefundException {
        CancellationPolicyEvaluation evaluation = cancellationPolicyService.evaluate(booking, payment.getAmount());

        Refund refund = new Refund();
        refund.setBooking(booking);
        refund.setPayment(payment);
        refund.setCancellationPolicy(evaluation.getPolicy());
        refund.setRefundPercentage(evaluation.getRefundPercentage());
        refund.setAmount(evaluation.getRefundAmount());
        refund.setReason(reason);
        refund.setStatus(RefundStatus.PENDING);
        refund = refundRepository.save(refund);

        if (evaluation.getRefundAmount() <= 0) {
            refund.setStatus(RefundStatus.SKIPPED);
            refund.setGatewayRefundId(null);
            refund = refundRepository.save(refund);
            if (cancelBooking) {
                cancelBookingSafely(booking.getId());
            }
            return RefundResponseDto.from(refundRepository.findDetailedById(refund.getId()).orElse(refund));
        }

        PaymentGateway gateway = paymentGatewayFactory.getGateway(payment.getProvider());
        GatewayRefundRequest gatewayRequest = new GatewayRefundRequest(
                payment.getGatewayOrderId(),
                payment.getGatewayPaymentReference(),
                evaluation.getRefundAmount(),
                payment.getCurrency(),
                booking.getId());
        GatewayRefundResult gatewayResult = gateway.refund(gatewayRequest);

        if (gatewayResult.isSuccess()) {
            refund.setStatus(RefundStatus.SUCCESS);
            refund.setGatewayRefundId(gatewayResult.getGatewayRefundId());
            payment.setStatus(evaluation.getRefundPercentage() >= 100
                    ? PaymentStatus.REFUNDED
                    : PaymentStatus.PARTIALLY_REFUNDED);
        } else {
            refund.setStatus(RefundStatus.FAILED);
            refund.setReason(appendReason(reason, gatewayResult.getFailureReason()));
            refundRepository.save(refund);
            throw new InvalidRefundException(
                    "Refund gateway call failed for booking " + booking.getId() + ": "
                            + gatewayResult.getFailureReason());
        }

        refundRepository.save(refund);
        paymentRepository.save(payment);
        if (cancelBooking) {
            cancelBookingSafely(booking.getId());
        }
        return RefundResponseDto.from(refundRepository.findDetailedById(refund.getId()).orElse(refund));
    }

    @Transactional(readOnly = true)
    @Override
    public RefundResponseDto getRefund(int refundId) throws InvalidRefundException {
        Refund refund = refundRepository.findDetailedById(refundId)
                .orElseThrow(() -> new InvalidRefundException("No refund found with id: " + refundId));
        return RefundResponseDto.from(refund);
    }

    private void cancelBookingSafely(int bookingId) throws InvalidRefundException {
        try {
            bookingService.cancelBooking(bookingId);
        } catch (InvalidBookingException e) {
            throw new InvalidRefundException("Could not cancel booking after refund: " + e.getMessage());
        }
    }

    private String appendReason(String reason, String gatewayFailure) {
        if (reason == null || reason.isBlank()) {
            return gatewayFailure;
        }
        if (gatewayFailure == null || gatewayFailure.isBlank()) {
            return reason;
        }
        return reason + " | " + gatewayFailure;
    }
}
