package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.WebhookResponseDto;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.models.PaymentProvider;
import org.example.bmsdec24.payments.GatewayWebhookPayload;
import org.example.bmsdec24.payments.adapter.RazorpayClientAdapter;
import org.example.bmsdec24.payments.adapter.StripeClientAdapter;
import org.example.bmsdec24.services.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/webhooks")
public class PaymentWebhookRestController {

    private final PaymentService paymentService;
    private final StripeClientAdapter stripeClientAdapter;
    private final RazorpayClientAdapter razorpayClientAdapter;

    public PaymentWebhookRestController(PaymentService paymentService,
                                        StripeClientAdapter stripeClientAdapter,
                                        RazorpayClientAdapter razorpayClientAdapter) {
        this.paymentService = paymentService;
        this.stripeClientAdapter = stripeClientAdapter;
        this.razorpayClientAdapter = razorpayClientAdapter;
    }

    @PostMapping("/stripe")
    public ResponseEntity<WebhookResponseDto> stripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature)
            throws InvalidRequestException {
        if (payload == null || payload.isBlank()) {
            throw new InvalidRequestException("Webhook payload is required");
        }
        GatewayWebhookPayload parsed = stripeClientAdapter.parseWebhook(payload, signature);
        WebhookResponseDto response = paymentService.processGatewayWebhook(PaymentProvider.STRIPE, parsed);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/razorpay")
    public ResponseEntity<WebhookResponseDto> razorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String eventId)
            throws InvalidRequestException {
        if (payload == null || payload.isBlank()) {
            throw new InvalidRequestException("Webhook payload is required");
        }
        GatewayWebhookPayload parsed = razorpayClientAdapter.parseWebhook(payload, signature, eventId);
        WebhookResponseDto response = paymentService.processGatewayWebhook(PaymentProvider.RAZORPAY, parsed);
        return ResponseEntity.ok(response);
    }
}
