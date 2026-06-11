package org.example.bmsdec24.services;

import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.CancellationPolicy;

public class CancellationPolicyEvaluation {

    private final CancellationPolicy policy;
    private final int refundPercentage;
    private final double refundAmount;
    private final long hoursUntilShow;

    public CancellationPolicyEvaluation(CancellationPolicy policy,
                                        int refundPercentage,
                                        double refundAmount,
                                        long hoursUntilShow) {
        this.policy = policy;
        this.refundPercentage = refundPercentage;
        this.refundAmount = refundAmount;
        this.hoursUntilShow = hoursUntilShow;
    }

    public CancellationPolicy getPolicy() {
        return policy;
    }

    public int getRefundPercentage() {
        return refundPercentage;
    }

    public double getRefundAmount() {
        return refundAmount;
    }

    public long getHoursUntilShow() {
        return hoursUntilShow;
    }
}
