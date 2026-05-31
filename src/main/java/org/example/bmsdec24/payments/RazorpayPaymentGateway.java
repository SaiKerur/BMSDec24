package org.example.bmsdec24.payments;

import org.example.bmsdec24.exceptions.PaymentGatewayException;
import org.example.bmsdec24.models.PaymentProvider;
import org.example.bmsdec24.payments.adapter.RazorpayClientAdapter;
import org.springframework.stereotype.Component;

/**
 * Strategy implementation for Razorpay — delegates SDK calls to {@link RazorpayClientAdapter}.
 */
@Component
public class RazorpayPaymentGateway implements PaymentGateway {

    private final RazorpayClientAdapter razorpayClientAdapter;

    public RazorpayPaymentGateway(RazorpayClientAdapter razorpayClientAdapter) {
        this.razorpayClientAdapter = razorpayClientAdapter;
    }

    @Override
    public PaymentProvider getProvider() {
        return PaymentProvider.RAZORPAY;
    }

    @Override
    public GatewayOrder createOrder(GatewayChargeRequest request) {
        try {
            return razorpayClientAdapter.createOrder(request);
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new PaymentGatewayException("Razorpay order creation failed: " + e.getMessage(), e);
        }
    }

    @Override
    public GatewayVerificationResult verify(GatewayVerificationRequest request) {
        try {
            return razorpayClientAdapter.verifyPayment(request);
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new PaymentGatewayException("Razorpay payment verification failed: " + e.getMessage(), e);
        }
    }
}
