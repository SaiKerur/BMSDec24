package org.example.bmsdec24.payments.adapter;

import org.example.bmsdec24.config.PaymentProperties;
import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;

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

    private boolean isSignatureValid(String signature) {
        return signature == null || signature.isBlank() || signature.startsWith(SIGNATURE_PREFIX);
    }
}
