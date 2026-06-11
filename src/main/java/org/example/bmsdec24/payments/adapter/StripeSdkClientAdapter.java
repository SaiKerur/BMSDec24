package org.example.bmsdec24.payments.adapter;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import org.example.bmsdec24.config.PaymentProperties;
import org.example.bmsdec24.exceptions.InvalidWebhookSignatureException;
import org.example.bmsdec24.exceptions.PaymentGatewayException;
import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;
import org.example.bmsdec24.payments.GatewayWebhookPayload;

/**
 * Wraps the official Stripe Java SDK behind the application adapter interface.
 */
public class StripeSdkClientAdapter implements StripeClientAdapter {

    private final PaymentProperties.Stripe stripe;

    public StripeSdkClientAdapter(PaymentProperties.Stripe stripe) {
        this.stripe = stripe;
        Stripe.apiKey = stripe.getSecretKey();
    }

    @Override
    public GatewayOrder createPaymentIntent(GatewayChargeRequest request) {
        try {
            long amountMinor = toMinorUnits(request.getAmount(), request.getCurrency());
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountMinor)
                    .setCurrency(request.getCurrency().toLowerCase())
                    .putMetadata("booking_id", String.valueOf(request.getBookingId()))
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build())
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);
            String checkoutUrl = "https://checkout.stripe.com/c/pay/" + intent.getId();
            return new GatewayOrder(
                    intent.getId(),
                    checkoutUrl,
                    intent.getClientSecret(),
                    stripe.getPublishableKey());
        } catch (StripeException e) {
            throw new PaymentGatewayException("Stripe payment intent creation failed: " + e.getMessage(), e);
        }
    }

    @Override
    public GatewayVerificationResult verifyPayment(GatewayVerificationRequest request) {
        if (!request.isReportedSuccess()) {
            return GatewayVerificationResult.failure(
                    request.getPaymentReference(), "Stripe reported the payment as failed");
        }
        try {
            String paymentIntentId = request.getPaymentReference() != null && !request.getPaymentReference().isBlank()
                    ? request.getPaymentReference()
                    : request.getOrderId();
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);

            if (!request.getOrderId().equals(intent.getId())) {
                return GatewayVerificationResult.failure(
                        paymentIntentId, "Payment intent does not match the initiated order");
            }
            if (!"succeeded".equalsIgnoreCase(intent.getStatus())) {
                return GatewayVerificationResult.failure(
                        paymentIntentId, "Stripe payment status is " + intent.getStatus());
            }
            return GatewayVerificationResult.success(intent.getId());
        } catch (StripeException e) {
            throw new PaymentGatewayException("Stripe payment verification failed: " + e.getMessage(), e);
        }
    }

    @Override
    public GatewayWebhookPayload parseWebhook(String payload, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) {
            throw new InvalidWebhookSignatureException("Missing Stripe-Signature header");
        }
        if (stripe.getWebhookSecret() == null || stripe.getWebhookSecret().isBlank()) {
            throw new PaymentGatewayException("Stripe webhook secret is not configured");
        }
        try {
            Event event = Webhook.constructEvent(payload, signatureHeader, stripe.getWebhookSecret());
            String eventType = event.getType();
            if (!eventType.startsWith("payment_intent.")) {
                return GatewayWebhookPayload.ignored(event.getId(), eventType);
            }

            StripeObject stripeObject = event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new PaymentGatewayException("Unable to deserialize Stripe webhook event"));
            if (!(stripeObject instanceof PaymentIntent intent)) {
                return GatewayWebhookPayload.ignored(event.getId(), eventType);
            }

            boolean succeeded = "payment_intent.succeeded".equals(eventType)
                    && "succeeded".equalsIgnoreCase(intent.getStatus());
            boolean failed = "payment_intent.payment_failed".equals(eventType)
                    || "payment_intent.canceled".equals(eventType);

            if (!succeeded && !failed) {
                return GatewayWebhookPayload.ignored(event.getId(), eventType);
            }

            String failureReason = failed
                    ? (intent.getLastPaymentError() != null
                    ? intent.getLastPaymentError().getMessage()
                    : "Stripe reported the payment as failed")
                    : null;
            return GatewayWebhookPayload.paymentOutcome(
                    event.getId(),
                    eventType,
                    intent.getId(),
                    intent.getId(),
                    succeeded,
                    failureReason);
        } catch (SignatureVerificationException e) {
            throw new InvalidWebhookSignatureException("Invalid Stripe webhook signature");
        }
    }

    private long toMinorUnits(double amount, String currency) {
        if (currency != null && ("JPY".equalsIgnoreCase(currency) || "KRW".equalsIgnoreCase(currency))) {
            return Math.round(amount);
        }
        return Math.round(amount * 100);
    }
}
