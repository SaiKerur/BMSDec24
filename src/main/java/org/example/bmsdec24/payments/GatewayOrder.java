package org.example.bmsdec24.payments;

public class GatewayOrder {

    private final String orderId;
    private final String checkoutUrl;
    private final String clientSecret;
    private final String publishableKey;

    public GatewayOrder(String orderId, String checkoutUrl, String clientSecret) {
        this(orderId, checkoutUrl, clientSecret, null);
    }

    public GatewayOrder(String orderId, String checkoutUrl, String clientSecret, String publishableKey) {
        this.orderId = orderId;
        this.checkoutUrl = checkoutUrl;
        this.clientSecret = clientSecret;
        this.publishableKey = publishableKey;
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

    public String getPublishableKey() {
        return publishableKey;
    }
}
