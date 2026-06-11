package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.WebhookProcessingOutcome;

public class WebhookResponseDto {

    private String gatewayEventId;
    private String eventType;
    private WebhookProcessingOutcome outcome;
    private Integer paymentId;
    private String paymentStatus;
    private String bookingStatus;

    public String getGatewayEventId() {
        return gatewayEventId;
    }

    public void setGatewayEventId(String gatewayEventId) {
        this.gatewayEventId = gatewayEventId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public WebhookProcessingOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(WebhookProcessingOutcome outcome) {
        this.outcome = outcome;
    }

    public Integer getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Integer paymentId) {
        this.paymentId = paymentId;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getBookingStatus() {
        return bookingStatus;
    }

    public void setBookingStatus(String bookingStatus) {
        this.bookingStatus = bookingStatus;
    }
}
