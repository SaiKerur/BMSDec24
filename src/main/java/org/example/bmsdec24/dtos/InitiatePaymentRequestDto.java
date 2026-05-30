package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.PaymentProvider;

public class InitiatePaymentRequestDto {
    private int bookingId;
    private PaymentProvider provider;

    public int getBookingId() {
        return bookingId;
    }

    public void setBookingId(int bookingId) {
        this.bookingId = bookingId;
    }

    public PaymentProvider getProvider() {
        return provider;
    }

    public void setProvider(PaymentProvider provider) {
        this.provider = provider;
    }
}
