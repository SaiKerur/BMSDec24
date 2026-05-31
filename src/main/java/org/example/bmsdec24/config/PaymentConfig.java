package org.example.bmsdec24.config;

import org.example.bmsdec24.payments.adapter.MockRazorpayClientAdapter;
import org.example.bmsdec24.payments.adapter.MockStripeClientAdapter;
import org.example.bmsdec24.payments.adapter.RazorpayClientAdapter;
import org.example.bmsdec24.payments.adapter.RazorpaySdkClientAdapter;
import org.example.bmsdec24.payments.adapter.StripeClientAdapter;
import org.example.bmsdec24.payments.adapter.StripeSdkClientAdapter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(PaymentProperties.class)
public class PaymentConfig {

    @Bean
    public StripeClientAdapter stripeClientAdapter(PaymentProperties paymentProperties) {
        if (useMock(paymentProperties) || !paymentProperties.getStripe().isConfigured()) {
            return new MockStripeClientAdapter(paymentProperties.getStripe());
        }
        return new StripeSdkClientAdapter(paymentProperties.getStripe());
    }

    @Bean
    public RazorpayClientAdapter razorpayClientAdapter(PaymentProperties paymentProperties) {
        if (useMock(paymentProperties) || !paymentProperties.getRazorpay().isConfigured()) {
            return new MockRazorpayClientAdapter(paymentProperties.getRazorpay());
        }
        return new RazorpaySdkClientAdapter(paymentProperties.getRazorpay());
    }

    private boolean useMock(PaymentProperties paymentProperties) {
        return paymentProperties.isMockEnabled();
    }
}
