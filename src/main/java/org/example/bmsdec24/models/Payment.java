package org.example.bmsdec24.models;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Data
@Entity(name = "payments")
public class Payment extends BaseModel {

    @ManyToOne
    private Ticket ticket;

    private double amount;

    private String currency;

    @Enumerated(value = EnumType.ORDINAL)
    private PaymentProvider provider;

    @Enumerated(value = EnumType.ORDINAL)
    private PaymentStatus status;

    private String gatewayOrderId;

    private String gatewayPaymentReference;

    private String failureReason;

    public Ticket getTicket() {
        return ticket;
    }

    public void setTicket(Ticket ticket) {
        this.ticket = ticket;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public PaymentProvider getProvider() {
        return provider;
    }

    public void setProvider(PaymentProvider provider) {
        this.provider = provider;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    public void setGatewayOrderId(String gatewayOrderId) {
        this.gatewayOrderId = gatewayOrderId;
    }

    public String getGatewayPaymentReference() {
        return gatewayPaymentReference;
    }

    public void setGatewayPaymentReference(String gatewayPaymentReference) {
        this.gatewayPaymentReference = gatewayPaymentReference;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}
