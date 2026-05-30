package org.example.bmsdec24.payments;

public class GatewayOrder {

    private final String orderId;
    private final String checkoutUrl;
    private final String clientSecret;

    public GatewayOrder(String orderId, String checkoutUrl, String clientSecret) {
        this.orderId = orderId;
        this.checkoutUrl = checkoutUrl;
        this.clientSecret = clientSecret;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
    }

    public String getClientSecret() {
        return clientSecret;
    }
}
