package org.example.bmsdec24.payments;

/**
 * Data received from the provider's callback/webhook that the gateway strategy
 * verifies before we trust the reported outcome.
 */
public class GatewayVerificationRequest {

    private final String orderId;
    private final String paymentReference;
    private final String signature;
    private final boolean reportedSuccess;

    public GatewayVerificationRequest(String orderId, String paymentReference, String signature, boolean reportedSuccess) {
        this.orderId = orderId;
        this.paymentReference = paymentReference;
        this.signature = signature;
        this.reportedSuccess = reportedSuccess;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public String getSignature() {
        return signature;
    }

    public boolean isReportedSuccess() {
        return reportedSuccess;
    }
}
