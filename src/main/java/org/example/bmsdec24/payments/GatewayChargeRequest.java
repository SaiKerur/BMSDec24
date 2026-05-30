package org.example.bmsdec24.payments;

/**
 * Immutable context passed to a {@link PaymentGateway} when creating a charge/order.
 */
public class GatewayChargeRequest {

    private final int ticketId;
    private final double amount;
    private final String currency;
    private final String customerEmail;

    public GatewayChargeRequest(int ticketId, double amount, String currency, String customerEmail) {
        this.ticketId = ticketId;
        this.amount = amount;
        this.currency = currency;
        this.customerEmail = customerEmail;
    }

    public int getTicketId() {
        return ticketId;
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
