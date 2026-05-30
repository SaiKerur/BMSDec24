package org.example.bmsdec24.payments;

import org.example.bmsdec24.models.PaymentProvider;

/**
 * Strategy abstraction for a payment provider (Stripe, Razorpay, ...).
 *
 * <p>Each concrete strategy knows how to create an order/intent and how to verify
 * the provider's callback signature. New providers are added by implementing this
 * interface and registering as a Spring bean - no changes required in the service
 * layer or the {@link PaymentGatewayFactory}.</p>
 */
public interface PaymentGateway {

    PaymentProvider getProvider();

    GatewayOrder createOrder(GatewayChargeRequest request);

    GatewayVerificationResult verify(GatewayVerificationRequest request);
}
