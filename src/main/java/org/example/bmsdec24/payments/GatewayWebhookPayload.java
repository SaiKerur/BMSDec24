package org.example.bmsdec24.payments;

/**
 * Normalized result of parsing a provider webhook payload after signature verification.
 */
public class GatewayWebhookPayload {

    private final String gatewayEventId;
    private final String eventType;
    private final String gatewayOrderId;
    private final String paymentReference;
    private final boolean paymentSucceeded;
    private final String failureReason;
    private final boolean actionable;

    private GatewayWebhookPayload(String gatewayEventId,
                                  String eventType,
                                  String gatewayOrderId,
                                  String paymentReference,
                                  boolean paymentSucceeded,
                                  String failureReason,
                                  boolean actionable) {
        this.gatewayEventId = gatewayEventId;
        this.eventType = eventType;
        this.gatewayOrderId = gatewayOrderId;
        this.paymentReference = paymentReference;
        this.paymentSucceeded = paymentSucceeded;
        this.failureReason = failureReason;
        this.actionable = actionable;
    }

    public static GatewayWebhookPayload paymentOutcome(String gatewayEventId,
                                                       String eventType,
                                                       String gatewayOrderId,
                                                       String paymentReference,
                                                       boolean paymentSucceeded,
                                                       String failureReason) {
        return new GatewayWebhookPayload(
                gatewayEventId,
                eventType,
                gatewayOrderId,
                paymentReference,
                paymentSucceeded,
                failureReason,
                true);
    }

    public static GatewayWebhookPayload ignored(String gatewayEventId, String eventType) {
        return new GatewayWebhookPayload(gatewayEventId, eventType, null, null, false, null, false);
    }

    public String getGatewayEventId() {
        return gatewayEventId;
    }

    public String getEventType() {
        return eventType;
    }

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public boolean isPaymentSucceeded() {
        return paymentSucceeded;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public boolean isActionable() {
        return actionable;
    }
}
