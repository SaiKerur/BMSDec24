package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.BookingStatus;

/**
 * Read-only projection of what a refund would look like for a booking, computed
 * by replaying the cancellation policy without persisting anything. Powers the
 * "Cancel &amp; refund" preview in the web UI before the user confirms.
 */
public class RefundPreviewDto {

    private int bookingId;
    private BookingStatus bookingStatus;
    private boolean eligible;
    private String reason;
    private double paidAmount;
    private int refundPercentage;
    private double refundAmount;
    private long hoursUntilShow;
    private String policyDescription;
    private boolean alreadyRefunded;

    public static RefundPreviewDto ineligible(int bookingId, BookingStatus status, String reason) {
        RefundPreviewDto dto = new RefundPreviewDto();
        dto.setBookingId(bookingId);
        dto.setBookingStatus(status);
        dto.setEligible(false);
        dto.setReason(reason);
        dto.setHoursUntilShow(-1);
        return dto;
    }

    public int getBookingId() {
        return bookingId;
    }

    public void setBookingId(int bookingId) {
        this.bookingId = bookingId;
    }

    public BookingStatus getBookingStatus() {
        return bookingStatus;
    }

    public void setBookingStatus(BookingStatus bookingStatus) {
        this.bookingStatus = bookingStatus;
    }

    public boolean isEligible() {
        return eligible;
    }

    public void setEligible(boolean eligible) {
        this.eligible = eligible;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public double getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(double paidAmount) {
        this.paidAmount = paidAmount;
    }

    public int getRefundPercentage() {
        return refundPercentage;
    }

    public void setRefundPercentage(int refundPercentage) {
        this.refundPercentage = refundPercentage;
    }

    public double getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(double refundAmount) {
        this.refundAmount = refundAmount;
    }

    public long getHoursUntilShow() {
        return hoursUntilShow;
    }

    public void setHoursUntilShow(long hoursUntilShow) {
        this.hoursUntilShow = hoursUntilShow;
    }

    public String getPolicyDescription() {
        return policyDescription;
    }

    public void setPolicyDescription(String policyDescription) {
        this.policyDescription = policyDescription;
    }

    public boolean isAlreadyRefunded() {
        return alreadyRefunded;
    }

    public void setAlreadyRefunded(boolean alreadyRefunded) {
        this.alreadyRefunded = alreadyRefunded;
    }
}
