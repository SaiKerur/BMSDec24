package org.example.bmsdec24.payments.adapter;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.example.bmsdec24.config.PaymentProperties;
import org.example.bmsdec24.exceptions.PaymentGatewayException;
import org.example.bmsdec24.payments.GatewayChargeRequest;
import org.example.bmsdec24.payments.GatewayOrder;
import org.example.bmsdec24.payments.GatewayVerificationRequest;
import org.example.bmsdec24.payments.GatewayVerificationResult;
import org.json.JSONObject;

/**
 * Wraps the official Razorpay Java SDK behind the application adapter interface.
 */
public class RazorpaySdkClientAdapter implements RazorpayClientAdapter {

    private final RazorpayClient client;
    private final PaymentProperties.Razorpay razorpay;

    public RazorpaySdkClientAdapter(PaymentProperties.Razorpay razorpay) {
        this.razorpay = razorpay;
        try {
            this.client = new RazorpayClient(razorpay.getKeyId(), razorpay.getKeySecret());
        } catch (RazorpayException e) {
            throw new PaymentGatewayException("Failed to initialize Razorpay client: " + e.getMessage(), e);
        }
    }

    @Override
    public GatewayOrder createOrder(GatewayChargeRequest request) {
        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", toMinorUnits(request.getAmount()));
            orderRequest.put("currency", request.getCurrency().toUpperCase());
            orderRequest.put("receipt", "booking_" + request.getBookingId());
            orderRequest.put("payment_capture", 1);

            Order order = client.orders.create(orderRequest);
            String orderId = order.get("id");
            String checkoutUrl = "https://api.razorpay.com/v1/checkout/embedded?order_id=" + orderId;
            return new GatewayOrder(orderId, checkoutUrl, razorpay.getKeyId(), razorpay.getKeyId());
        } catch (RazorpayException e) {
            throw new PaymentGatewayException("Razorpay order creation failed: " + e.getMessage(), e);
        }
    }

    @Override
    public GatewayVerificationResult verifyPayment(GatewayVerificationRequest request) {
        if (!request.isReportedSuccess()) {
            return GatewayVerificationResult.failure(
                    request.getPaymentReference(), "Razorpay reported the payment as failed");
        }
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getOrderId());
            options.put("razorpay_payment_id", request.getPaymentReference());
            options.put("razorpay_signature", request.getSignature());

            boolean valid = Utils.verifyPaymentSignature(options, razorpay.getKeySecret());
            if (!valid) {
                return GatewayVerificationResult.failure(
                        request.getPaymentReference(), "Invalid Razorpay payment signature");
            }
            return GatewayVerificationResult.success(request.getPaymentReference());
        } catch (RazorpayException e) {
            throw new PaymentGatewayException("Razorpay payment verification failed: " + e.getMessage(), e);
        }
    }

    private int toMinorUnits(double amount) {
        return (int) Math.round(amount * 100);
    }
}
