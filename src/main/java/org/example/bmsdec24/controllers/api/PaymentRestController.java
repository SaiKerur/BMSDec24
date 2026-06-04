package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.InitiatePaymentRequestDto;
import org.example.bmsdec24.dtos.PaymentCallbackRequestDto;
import org.example.bmsdec24.dtos.PaymentProviderOptionDto;
import org.example.bmsdec24.dtos.PaymentResponseDto;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.PaymentAlreadyProcessedException;
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

    public PaymentRestController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/providers")
    public ResponseEntity<List<PaymentProviderOptionDto>> listProviders() {
        return ResponseEntity.ok(paymentService.listAvailableProviders());
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponseDto> initiatePayment(@RequestBody InitiatePaymentRequestDto requestDto)
            throws InvalidPaymentException, InvalidRequestException {
        validateInitiateRequest(requestDto);
        PaymentResponseDto response = paymentService.initiatePayment(
                requestDto.getBookingId(), requestDto.getProvider());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/callback")
    public ResponseEntity<PaymentResponseDto> handleCallback(@RequestBody PaymentCallbackRequestDto requestDto)
            throws InvalidPaymentException, PaymentAlreadyProcessedException, InvalidRequestException {
        validateCallbackRequest(requestDto);
        return ResponseEntity.ok(paymentService.completePayment(
                requestDto.getPaymentId(),
                requestDto.getPaymentReference(),
                requestDto.getSignature(),
                requestDto.isSuccess()));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseDto> getPayment(@PathVariable int paymentId)
            throws InvalidPaymentException, InvalidRequestException {
        if (paymentId <= 0) {
            throw new InvalidRequestException("paymentId must be a positive integer");
        }
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
