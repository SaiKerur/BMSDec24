package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Payment;
import org.example.bmsdec24.models.PaymentProvider;
import org.example.bmsdec24.models.PaymentStatus;
import org.example.bmsdec24.models.TicketStatus;

public class PaymentResponseDto {
    private int paymentId;
    private int ticketId;
    private PaymentProvider provider;
    private PaymentStatus status;
    private double amount;
    private String currency;
    private String gatewayOrderId;
    private String checkoutUrl;
    private String clientSecret;
    private String paymentReference;
    private String failureReason;
    private TicketStatus ticketStatus;

    public static PaymentResponseDto from(Payment payment) {
        PaymentResponseDto dto = new PaymentResponseDto();
        dto.setPaymentId(payment.getId());
        if (payment.getTicket() != null) {
            dto.setTicketId(payment.getTicket().getId());
            dto.setTicketStatus(payment.getTicket().getStatus());
        }
        dto.setProvider(payment.getProvider());
        dto.setStatus(payment.getStatus());
        dto.setAmount(payment.getAmount());
        dto.setCurrency(payment.getCurrency());
        dto.setGatewayOrderId(payment.getGatewayOrderId());
        dto.setPaymentReference(payment.getGatewayPaymentReference());
        dto.setFailureReason(payment.getFailureReason());
        return dto;
    }

    public int getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(int paymentId) {
        this.paymentId = paymentId;
    }

    public int getTicketId() {
        return ticketId;
    }

    public void setTicketId(int ticketId) {
        this.ticketId = ticketId;
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

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    public void setGatewayOrderId(String gatewayOrderId) {
        this.gatewayOrderId = gatewayOrderId;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
    }

    public void setCheckoutUrl(String checkoutUrl) {
        this.checkoutUrl = checkoutUrl;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(String paymentReference) {
        this.paymentReference = paymentReference;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public TicketStatus getTicketStatus() {
        return ticketStatus;
    }

    public void setTicketStatus(TicketStatus ticketStatus) {
        this.ticketStatus = ticketStatus;
    }
}
