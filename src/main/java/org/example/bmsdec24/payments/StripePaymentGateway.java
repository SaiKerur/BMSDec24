package org.example.bmsdec24.payments;

import org.example.bmsdec24.models.PaymentProvider;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Stripe strategy. This is a self-contained simulation of Stripe's PaymentIntent
 * flow; the {@code TODO} markers show exactly where the real Stripe SDK calls
 * would slot in. Behaviour is deterministic so it can be exercised end-to-end
 * without external network access or API keys.
 */
@Component
public class StripePaymentGateway implements PaymentGateway {

    private static final String SIGNATURE_PREFIX = "whsec_";

    @Override
    public PaymentProvider getProvider() {
        return PaymentProvider.STRIPE;
    }

    @Override
    public GatewayOrder createOrder(GatewayChargeRequest request) {
        // TODO: replace with com.stripe.model.PaymentIntent.create(...) using the secret key.
        String intentId = "pi_" + UUID.randomUUID().toString().replace("-", "");
        String clientSecret = intentId + "_secret_" + UUID.randomUUID().toString().substring(0, 8);
        String checkoutUrl = "https://checkout.stripe.com/pay/" + intentId;
        return new GatewayOrder(intentId, checkoutUrl, clientSecret);
    }

    @Override
    public GatewayVerificationResult verify(GatewayVerificationRequest request) {
        // TODO: replace with com.stripe.net.Webhook.constructEvent(payload, sigHeader, endpointSecret).
        if (!isSignatureValid(request)) {
            return GatewayVerificationResult.failure(request.getPaymentReference(), "Invalid Stripe webhook signature");
        }
        if (!request.isReportedSuccess()) {
            return GatewayVerificationResult.failure(request.getPaymentReference(), "Stripe reported the payment as failed");
        }
        return GatewayVerificationResult.success(request.getPaymentReference());
    }

    private boolean isSignatureValid(GatewayVerificationRequest request) {
        // Dev simulation: a blank signature is accepted; any provided signature must
        // carry Stripe's webhook secret prefix. Real impl validates an HMAC.
        String signature = request.getSignature();
        return signature == null || signature.isBlank() || signature.startsWith(SIGNATURE_PREFIX);
    }
}
