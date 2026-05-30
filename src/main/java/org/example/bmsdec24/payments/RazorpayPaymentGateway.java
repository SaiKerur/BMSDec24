package org.example.bmsdec24.payments;

import org.example.bmsdec24.models.PaymentProvider;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Razorpay strategy. Self-contained simulation of Razorpay's Orders + signature
 * verification flow; {@code TODO} markers indicate where the real Razorpay SDK
 * calls would go. Deterministic so it runs without API keys or network access.
 */
@Component
public class RazorpayPaymentGateway implements PaymentGateway {

    private static final String SIGNATURE_PREFIX = "rzp_sig_";

    @Override
    public PaymentProvider getProvider() {
        return PaymentProvider.RAZORPAY;
    }

    @Override
    public GatewayOrder createOrder(GatewayChargeRequest request) {
        // TODO: replace with com.razorpay.RazorpayClient.orders.create(orderRequest).
        String orderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);
        String checkoutUrl = "https://api.razorpay.com/v1/checkout/embedded?order_id=" + orderId;
        // Razorpay exposes the key id (not a secret) to the client to open checkout.
        String clientKey = "rzp_test_" + UUID.randomUUID().toString().substring(0, 10);
        return new GatewayOrder(orderId, checkoutUrl, clientKey);
    }

    @Override
    public GatewayVerificationResult verify(GatewayVerificationRequest request) {
        // TODO: replace with com.razorpay.Utils.verifyPaymentSignature(attributes, secret).
        if (!isSignatureValid(request)) {
            return GatewayVerificationResult.failure(request.getPaymentReference(), "Invalid Razorpay payment signature");
        }
        if (!request.isReportedSuccess()) {
            return GatewayVerificationResult.failure(request.getPaymentReference(), "Razorpay reported the payment as failed");
        }
        return GatewayVerificationResult.success(request.getPaymentReference());
    }

    private boolean isSignatureValid(GatewayVerificationRequest request) {
        // Dev simulation: a blank signature is accepted; any provided signature must
        // carry Razorpay's signature prefix. Real impl validates an HMAC-SHA256.
        String signature = request.getSignature();
        return signature == null || signature.isBlank() || signature.startsWith(SIGNATURE_PREFIX);
    }
}
