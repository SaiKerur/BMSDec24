package org.example.bmsdec24.payments;

import org.example.bmsdec24.exceptions.PaymentGatewayException;
import org.example.bmsdec24.models.PaymentProvider;
import org.example.bmsdec24.payments.adapter.StripeClientAdapter;
import org.springframework.stereotype.Component;

/**
 * Strategy implementation for Stripe — delegates SDK calls to {@link StripeClientAdapter}.
 */
@Component
public class StripePaymentGateway implements PaymentGateway {

    private final StripeClientAdapter stripeClientAdapter;

    public StripePaymentGateway(StripeClientAdapter stripeClientAdapter) {
        this.stripeClientAdapter = stripeClientAdapter;
    }

    @Override
    public PaymentProvider getProvider() {
        return PaymentProvider.STRIPE;
    }

    @Override
    public GatewayOrder createOrder(GatewayChargeRequest request) {
        try {
            return stripeClientAdapter.createPaymentIntent(request);
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new PaymentGatewayException("Stripe order creation failed: " + e.getMessage(), e);
        }
    }

    @Override
    public GatewayVerificationResult verify(GatewayVerificationRequest request) {
        try {
            return stripeClientAdapter.verifyPayment(request);
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new PaymentGatewayException("Stripe payment verification failed: " + e.getMessage(), e);
        }
    }
}
