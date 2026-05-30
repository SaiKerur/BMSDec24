package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.InitiatePaymentRequestDto;
import org.example.bmsdec24.dtos.PaymentCallbackRequestDto;
import org.example.bmsdec24.dtos.PaymentResponseDto;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
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

@RestController
@RequestMapping("/api/payments")
public class PaymentRestController {

    private final PaymentService paymentService;

    public PaymentRestController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponseDto> initiatePayment(@RequestBody InitiatePaymentRequestDto requestDto) {
        try {
            if (requestDto == null || requestDto.getBookingId() <= 0 || requestDto.getProvider() == null) {
                return ResponseEntity.badRequest().build();
            }
            PaymentResponseDto response = paymentService.initiatePayment(
                    requestDto.getBookingId(), requestDto.getProvider());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (InvalidPaymentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/callback")
    public ResponseEntity<PaymentResponseDto> handleCallback(@RequestBody PaymentCallbackRequestDto requestDto) {
        try {
            if (requestDto == null || requestDto.getPaymentId() <= 0) {
                return ResponseEntity.badRequest().build();
            }
            PaymentResponseDto response = paymentService.completePayment(
                    requestDto.getPaymentId(),
                    requestDto.getPaymentReference(),
                    requestDto.getSignature(),
                    requestDto.isSuccess());
            return ResponseEntity.ok(response);
        } catch (InvalidPaymentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (PaymentAlreadyProcessedException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseDto> getPayment(@PathVariable int paymentId) {
        try {
            return ResponseEntity.ok(paymentService.getPayment(paymentId));
        } catch (InvalidPaymentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
