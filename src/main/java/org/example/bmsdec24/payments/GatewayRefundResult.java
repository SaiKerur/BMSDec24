package org.example.bmsdec24.payments;

public class GatewayRefundResult {

    private final String gatewayRefundId;
    private final boolean success;
    private final String failureReason;

    private GatewayRefundResult(String gatewayRefundId, boolean success, String failureReason) {
        this.gatewayRefundId = gatewayRefundId;
        this.success = success;
        this.failureReason = failureReason;
    }

    public static GatewayRefundResult success(String gatewayRefundId) {
        return new GatewayRefundResult(gatewayRefundId, true, null);
    }

    public static GatewayRefundResult failure(String failureReason) {
        return new GatewayRefundResult(null, false, failureReason);
    }

    public String getGatewayRefundId() {
        return gatewayRefundId;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getFailureReason() {
        return failureReason;
    }
}
