package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.PaymentProvider;

public class InitiatePaymentRequestDto {
    private int ticketId;
    private PaymentProvider provider;

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
}
