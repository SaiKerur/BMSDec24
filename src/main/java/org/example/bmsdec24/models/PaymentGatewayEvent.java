package org.example.bmsdec24.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "payment_gateway_events",
        uniqueConstraints = @UniqueConstraint(name = "uk_gateway_event_id", columnNames = "gateway_event_id"))
public class PaymentGatewayEvent extends BaseModel {

    @Column(name = "gateway_event_id", nullable = false, length = 255)
    private String gatewayEventId;

    @Enumerated(EnumType.STRING)
    private PaymentProvider provider;

    private String eventType;

    @ManyToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Enumerated(EnumType.STRING)
    private WebhookProcessingOutcome outcome;

    private String gatewayOrderId;

    public String getGatewayEventId() {
        return gatewayEventId;
    }

    public void setGatewayEventId(String gatewayEventId) {
        this.gatewayEventId = gatewayEventId;
    }

    public PaymentProvider getProvider() {
        return provider;
    }

    public void setProvider(PaymentProvider provider) {
        this.provider = provider;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment payment) {
        this.payment = payment;
    }

    public WebhookProcessingOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(WebhookProcessingOutcome outcome) {
        this.outcome = outcome;
    }

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    public void setGatewayOrderId(String gatewayOrderId) {
        this.gatewayOrderId = gatewayOrderId;
    }
}
