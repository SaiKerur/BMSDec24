package org.example.bmsdec24.dtos;

/**
 * Simulates the payload a provider posts back (or the client forwards) after the
 * user completes/aborts payment on the hosted checkout page.
 */
public class PaymentCallbackRequestDto {
    private int paymentId;
    private String paymentReference;
    private String signature;
    private boolean success;

    public int getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(int paymentId) {
        this.paymentId = paymentId;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(String paymentReference) {
        this.paymentReference = paymentReference;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }
}
