package org.example.bmsdec24.payments;

public class GatewayVerificationResult {

    private final boolean success;
    private final String paymentReference;
    private final String failureReason;

    private GatewayVerificationResult(boolean success, String paymentReference, String failureReason) {
        this.success = success;
        this.paymentReference = paymentReference;
        this.failureReason = failureReason;
    }

    public static GatewayVerificationResult success(String paymentReference) {
        return new GatewayVerificationResult(true, paymentReference, null);
    }

    public static GatewayVerificationResult failure(String paymentReference, String failureReason) {
        return new GatewayVerificationResult(false, paymentReference, failureReason);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public String getFailureReason() {
        return failureReason;
    }
}
