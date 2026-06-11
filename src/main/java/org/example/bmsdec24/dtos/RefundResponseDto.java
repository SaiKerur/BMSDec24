package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.Refund;
import org.example.bmsdec24.models.RefundStatus;

public class RefundResponseDto {

    private int refundId;
    private int bookingId;
    private int paymentId;
    private double amount;
    private String reason;
    private RefundStatus status;
    private String gatewayRefundId;
    private int refundPercentage;
    private BookingStatus bookingStatus;

    public static RefundResponseDto from(Refund refund) {
        RefundResponseDto dto = new RefundResponseDto();
        dto.setRefundId(refund.getId());
        if (refund.getBooking() != null) {
            dto.setBookingId(refund.getBooking().getId());
            dto.setBookingStatus(refund.getBooking().getStatus());
        }
        if (refund.getPayment() != null) {
            dto.setPaymentId(refund.getPayment().getId());
        }
        dto.setAmount(refund.getAmount());
        dto.setReason(refund.getReason());
        dto.setStatus(refund.getStatus());
        dto.setGatewayRefundId(refund.getGatewayRefundId());
        dto.setRefundPercentage(refund.getRefundPercentage());
        return dto;
    }

    public int getRefundId() {
        return refundId;
    }

    public void setRefundId(int refundId) {
        this.refundId = refundId;
    }

    public int getBookingId() {
        return bookingId;
    }

    public void setBookingId(int bookingId) {
        this.bookingId = bookingId;
    }

    public int getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(int paymentId) {
        this.paymentId = paymentId;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public RefundStatus getStatus() {
        return status;
    }

    public void setStatus(RefundStatus status) {
        this.status = status;
    }

    public String getGatewayRefundId() {
        return gatewayRefundId;
    }

    public void setGatewayRefundId(String gatewayRefundId) {
        this.gatewayRefundId = gatewayRefundId;
    }

    public int getRefundPercentage() {
        return refundPercentage;
    }

    public void setRefundPercentage(int refundPercentage) {
        this.refundPercentage = refundPercentage;
    }

    public BookingStatus getBookingStatus() {
        return bookingStatus;
    }

    public void setBookingStatus(BookingStatus bookingStatus) {
        this.bookingStatus = bookingStatus;
    }
}
