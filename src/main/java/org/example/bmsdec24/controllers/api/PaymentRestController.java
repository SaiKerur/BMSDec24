package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.InitiatePaymentRequestDto;
import org.example.bmsdec24.dtos.PaymentCallbackRequestDto;
import org.example.bmsdec24.dtos.PaymentProviderOptionDto;
import org.example.bmsdec24.dtos.PaymentResponseDto;
import org.example.bmsdec24.exceptions.AccessDeniedException;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.PaymentAlreadyProcessedException;
import org.example.bmsdec24.models.Payment;
import org.example.bmsdec24.repos.PaymentRepository;
import org.example.bmsdec24.security.AuthenticatedUser;
import org.example.bmsdec24.security.BookingAccessService;
import org.example.bmsdec24.security.SecurityUtils;
import org.example.bmsdec24.services.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentRestController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final BookingAccessService bookingAccessService;

    public PaymentRestController(PaymentService paymentService,
                                   PaymentRepository paymentRepository,
                                   BookingAccessService bookingAccessService) {
        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
        this.bookingAccessService = bookingAccessService;
    }

    @GetMapping("/providers")
    public ResponseEntity<List<PaymentProviderOptionDto>> listProviders() {
        return ResponseEntity.ok(paymentService.listAvailableProviders());
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponseDto> initiatePayment(@RequestBody InitiatePaymentRequestDto requestDto)
            throws InvalidPaymentException, InvalidRequestException, AccessDeniedException {
        validateInitiateRequest(requestDto);
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireBookingAccess(requestDto.getBookingId(), currentUser);
        PaymentResponseDto response = paymentService.initiatePayment(
                requestDto.getBookingId(), requestDto.getProvider());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/callback")
    public ResponseEntity<PaymentResponseDto> handleCallback(@RequestBody PaymentCallbackRequestDto requestDto)
            throws InvalidPaymentException, PaymentAlreadyProcessedException, InvalidRequestException, AccessDeniedException {
        validateCallbackRequest(requestDto);
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        Payment payment = paymentRepository.findDetailedById(requestDto.getPaymentId())
                .orElseThrow(() -> new InvalidPaymentException("No payment found with id: " + requestDto.getPaymentId()));
        bookingAccessService.requirePaymentAccess(payment, currentUser);
        return ResponseEntity.ok(paymentService.completePayment(
                requestDto.getPaymentId(),
                requestDto.getPaymentReference(),
                requestDto.getSignature(),
                requestDto.isSuccess()));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseDto> getPayment(@PathVariable int paymentId)
            throws InvalidPaymentException, InvalidRequestException, AccessDeniedException {
        if (paymentId <= 0) {
            throw new InvalidRequestException("paymentId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        Payment payment = paymentRepository.findDetailedById(paymentId)
                .orElseThrow(() -> new InvalidPaymentException("No payment found with id: " + paymentId));
        bookingAccessService.requirePaymentAccess(payment, currentUser);
        return ResponseEntity.ok(paymentService.getPayment(paymentId));
    }

    private void validateInitiateRequest(InitiatePaymentRequestDto requestDto) throws InvalidRequestException {
        if (requestDto == null) {
            throw new InvalidRequestException("Request body is required with bookingId and provider (STRIPE or RAZORPAY)");
        }
        if (requestDto.getBookingId() <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        if (requestDto.getProvider() == null) {
            throw new InvalidRequestException("provider is required (STRIPE or RAZORPAY)");
        }
    }

    private void validateCallbackRequest(PaymentCallbackRequestDto requestDto) throws InvalidRequestException {
        if (requestDto == null) {
            throw new InvalidRequestException("Request body is required with paymentId and success flag");
        }
        if (requestDto.getPaymentId() <= 0) {
            throw new InvalidRequestException("paymentId must be a positive integer");
        }
    }
}
