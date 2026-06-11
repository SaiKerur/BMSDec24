package org.example.bmsdec24.payments.adapter;

import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;
import org.example.bmsdec24.payments.GatewayWebhookPayload;

/**
 * Adapter boundary between BMS and the Razorpay Java SDK.
 */
public interface RazorpayClientAdapter {

    GatewayOrder createOrder(GatewayChargeRequest request);

    GatewayVerificationResult verifyPayment(GatewayVerificationRequest request);

    GatewayWebhookPayload parseWebhook(String payload, String signatureHeader, String gatewayEventId);
}
