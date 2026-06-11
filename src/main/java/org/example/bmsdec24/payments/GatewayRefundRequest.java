package org.example.bmsdec24.payments;

public class GatewayRefundRequest {

    private final String gatewayOrderId;
    private final String gatewayPaymentReference;
    private final double amount;
    private final String currency;
    private final int bookingId;

    public GatewayRefundRequest(String gatewayOrderId,
                                String gatewayPaymentReference,
                                double amount,
                                String currency,
                                int bookingId) {
        this.gatewayOrderId = gatewayOrderId;
        this.gatewayPaymentReference = gatewayPaymentReference;
        this.amount = amount;
        this.currency = currency;
        this.bookingId = bookingId;
    }

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    public String getGatewayPaymentReference() {
        return gatewayPaymentReference;
    }

    public double getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public int getBookingId() {
        return bookingId;
    }
}
