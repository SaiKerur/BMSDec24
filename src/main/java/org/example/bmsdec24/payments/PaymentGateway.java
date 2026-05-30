package org.example.bmsdec24.payments;

import org.example.bmsdec24.models.PaymentProvider;

public interface PaymentGateway {

    PaymentProvider getProvider();

    GatewayOrder createOrder(GatewayChargeRequest request);

    GatewayVerificationResult verify(GatewayVerificationRequest request);
}
