package org.example.bmsdec24.payments.adapter;

import org.example.bmsdec24.config.PaymentProperties;
import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;

import java.util.UUID;

/**
 * Simulates Razorpay when mock mode is enabled or API keys are not configured.
 */
public class MockRazorpayClientAdapter implements RazorpayClientAdapter {

    private static final String SIGNATURE_PREFIX = "rzp_sig_";

    private final PaymentProperties.Razorpay razorpay;

    public MockRazorpayClientAdapter(PaymentProperties.Razorpay razorpay) {
        this.razorpay = razorpay;
    }

    @Override
    public GatewayOrder createOrder(GatewayChargeRequest request) {
        String orderId = "order_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String checkoutUrl = "https://api.razorpay.com/v1/checkout/embedded?order_id=" + orderId;
        String keyId = razorpay.getKeyId() != null && !razorpay.getKeyId().isBlank()
                ? razorpay.getKeyId()
                : "rzp_test_mock";
        return new GatewayOrder(orderId, checkoutUrl, keyId, keyId);
    }

    @Override
    public GatewayVerificationResult verifyPayment(GatewayVerificationRequest request) {
        if (!isSignatureValid(request.getSignature())) {
            return GatewayVerificationResult.failure(
                    request.getPaymentReference(), "Invalid Razorpay payment signature");
        }
        if (!request.isReportedSuccess()) {
            return GatewayVerificationResult.failure(
                    request.getPaymentReference(), "Razorpay reported the payment as failed");
        }
        return GatewayVerificationResult.success(request.getPaymentReference());
    }

    private boolean isSignatureValid(String signature) {
        return signature == null || signature.isBlank() || signature.startsWith(SIGNATURE_PREFIX);
    }
}
