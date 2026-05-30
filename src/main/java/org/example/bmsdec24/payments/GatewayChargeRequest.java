package org.example.bmsdec24.payments;

public class GatewayChargeRequest {

    private final int bookingId;
    private final double amount;
    private final String currency;
    private final String customerEmail;

    public GatewayChargeRequest(int bookingId, double amount, String currency, String customerEmail) {
        this.bookingId = bookingId;
        this.amount = amount;
        this.currency = currency;
        this.customerEmail = customerEmail;
    }

    public int getBookingId() {
        return bookingId;
    }

    public double getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }
}
