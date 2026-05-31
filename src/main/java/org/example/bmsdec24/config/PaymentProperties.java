package org.example.bmsdec24.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "bms.payment")
public class PaymentProperties {

    private boolean mockEnabled = true;
    private Stripe stripe = new Stripe();
    private Razorpay razorpay = new Razorpay();

    public boolean isMockEnabled() {
        return mockEnabled;
    }

    public void setMockEnabled(boolean mockEnabled) {
        this.mockEnabled = mockEnabled;
    }

    public Stripe getStripe() {
        return stripe;
    }

    public void setStripe(Stripe stripe) {
        this.stripe = stripe;
    }

    public Razorpay getRazorpay() {
        return razorpay;
    }

    public void setRazorpay(Razorpay razorpay) {
        this.razorpay = razorpay;
    }

    public static class Stripe {
        private String secretKey = "";
        private String publishableKey = "";
        private String webhookSecret = "";

        public String getSecretKey() {
            return secretKey;
        }

        public void setSecretKey(String secretKey) {
            this.secretKey = secretKey;
        }

        public String getPublishableKey() {
            return publishableKey;
        }

        public void setPublishableKey(String publishableKey) {
            this.publishableKey = publishableKey;
        }

        public String getWebhookSecret() {
            return webhookSecret;
        }

        public void setWebhookSecret(String webhookSecret) {
            this.webhookSecret = webhookSecret;
        }

        public boolean isConfigured() {
            return secretKey != null && !secretKey.isBlank();
        }
    }

    public static class Razorpay {
        private String keyId = "";
        private String keySecret = "";

        public String getKeyId() {
            return keyId;
        }

        public void setKeyId(String keyId) {
            this.keyId = keyId;
        }

        public String getKeySecret() {
            return keySecret;
        }

        public void setKeySecret(String keySecret) {
            this.keySecret = keySecret;
        }

        public boolean isConfigured() {
            return keyId != null && !keyId.isBlank()
                    && keySecret != null && !keySecret.isBlank();
        }
    }
}
