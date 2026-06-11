package org.example.bmsdec24.payments.adapter;

import org.example.bmsdec24.config.PaymentProperties;
import org.example.bmsdec24.exceptions.InvalidWebhookSignatureException;
import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayRefundRequest;
import org.example.bmsdec24.payments.GatewayRefundResult;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;
import org.example.bmsdec24.payments.GatewayWebhookPayload;
import org.json.JSONObject;

import java.util.UUID;

/**
 * Simulates Stripe when mock mode is enabled or API keys are not configured.
 */
public class MockStripeClientAdapter implements StripeClientAdapter {

    private static final String SIGNATURE_PREFIX = "whsec_";

    private final PaymentProperties.Stripe stripe;

    public MockStripeClientAdapter(PaymentProperties.Stripe stripe) {
        this.stripe = stripe;
    }

    @Override
    public GatewayOrder createPaymentIntent(GatewayChargeRequest request) {
        String intentId = "pi_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String clientSecret = intentId + "_secret_" + UUID.randomUUID().toString().substring(0, 8);
        String checkoutUrl = "https://checkout.stripe.com/pay/" + intentId;
        String publishableKey = stripe.getPublishableKey() != null && !stripe.getPublishableKey().isBlank()
                ? stripe.getPublishableKey()
                : "pk_test_mock";
        return new GatewayOrder(intentId, checkoutUrl, clientSecret, publishableKey);
    }

    @Override
    public GatewayVerificationResult verifyPayment(GatewayVerificationRequest request) {
        if (!isSignatureValid(request.getSignature())) {
            return GatewayVerificationResult.failure(
                    request.getPaymentReference(), "Invalid Stripe webhook signature");
        }
        if (!request.isReportedSuccess()) {
            return GatewayVerificationResult.failure(
                    request.getPaymentReference(), "Stripe reported the payment as failed");
        }
        return GatewayVerificationResult.success(request.getPaymentReference());
    }

    @Override
    public GatewayWebhookPayload parseWebhook(String payload, String signatureHeader) {
        if (!isSignatureValid(signatureHeader)) {
            throw new InvalidWebhookSignatureException("Invalid Stripe webhook signature");
        }
        JSONObject event = new JSONObject(payload);
        String eventId = event.getString("id");
        String eventType = event.getString("type");

        if (!eventType.startsWith("payment_intent.")) {
            return GatewayWebhookPayload.ignored(eventId, eventType);
        }

        JSONObject intent = event.getJSONObject("data").getJSONObject("object");
        String orderId = intent.getString("id");
        String status = intent.optString("status", "");
        boolean succeeded = "payment_intent.succeeded".equals(eventType) && "succeeded".equalsIgnoreCase(status);
        boolean failed = "payment_intent.payment_failed".equals(eventType)
                || "payment_intent.canceled".equals(eventType)
                || "requires_payment_method".equalsIgnoreCase(status);

        if (!succeeded && !failed) {
            return GatewayWebhookPayload.ignored(eventId, eventType);
        }

        String failureReason = failed ? "Stripe reported the payment as failed" : null;
        return GatewayWebhookPayload.paymentOutcome(
                eventId,
                eventType,
                orderId,
                orderId,
                succeeded,
                failureReason);
    }

    @Override
    public GatewayRefundResult createRefund(GatewayRefundRequest request) {
        String refundId = "re_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return GatewayRefundResult.success(refundId);
    }

    private boolean isSignatureValid(String signature) {
        return signature == null || signature.isBlank() || signature.startsWith(SIGNATURE_PREFIX);
    }
}
