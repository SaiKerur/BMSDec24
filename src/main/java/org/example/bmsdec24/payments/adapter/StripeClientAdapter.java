package org.example.bmsdec24.payments.adapter;

import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;

/**
 * Adapter boundary between BMS and the Stripe Java SDK.
 */
public interface StripeClientAdapter {

    GatewayOrder createPaymentIntent(GatewayChargeRequest request);

    GatewayVerificationResult verifyPayment(GatewayVerificationRequest request);
}
