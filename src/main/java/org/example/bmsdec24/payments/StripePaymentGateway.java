package org.example.bmsdec24.payments;

import org.example.bmsdec24.models.PaymentProvider;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class StripePaymentGateway implements PaymentGateway {

    private static final String SIGNATURE_PREFIX = "whsec_";

    @Override
    public PaymentProvider getProvider() {
        return PaymentProvider.STRIPE;
    }

    @Override
    public GatewayOrder createOrder(GatewayChargeRequest request) {
        String intentId = "pi_" + UUID.randomUUID().toString().replace("-", "");
        String clientSecret = intentId + "_secret_" + UUID.randomUUID().toString().substring(0, 8);
        String checkoutUrl = "https://checkout.stripe.com/pay/" + intentId;
        return new GatewayOrder(intentId, checkoutUrl, clientSecret);
    }

    @Override
    public GatewayVerificationResult verify(GatewayVerificationRequest request) {
        if (!isSignatureValid(request)) {
            return GatewayVerificationResult.failure(request.getPaymentReference(), "Invalid Stripe webhook signature");
        }
        if (!request.isReportedSuccess()) {
            return GatewayVerificationResult.failure(request.getPaymentReference(), "Stripe reported the payment as failed");
        }
        return GatewayVerificationResult.success(request.getPaymentReference());
    }

    private boolean isSignatureValid(GatewayVerificationRequest request) {
        String signature = request.getSignature();
        return signature == null || signature.isBlank() || signature.startsWith(SIGNATURE_PREFIX);
    }
}
