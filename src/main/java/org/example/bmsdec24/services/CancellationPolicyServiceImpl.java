package org.example.bmsdec24.services;

import org.example.bmsdec24.exceptions.RefundNotAllowedException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.CancellationPolicy;
import org.example.bmsdec24.models.Show;
import org.example.bmsdec24.repos.CancellationPolicyRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Date;
import java.util.List;

@Service
public class CancellationPolicyServiceImpl implements CancellationPolicyService {

    private static final int DEFAULT_NO_SHOW_REFUND_PERCENTAGE = 100;

    private final CancellationPolicyRepository cancellationPolicyRepository;

    public CancellationPolicyServiceImpl(CancellationPolicyRepository cancellationPolicyRepository) {
        this.cancellationPolicyRepository = cancellationPolicyRepository;
    }

    @Override
    public CancellationPolicyEvaluation evaluate(Booking booking, double paidAmount) throws RefundNotAllowedException {
        Show show = booking.getShow();
        if (show == null || show.getStartTime() == null) {
            return new CancellationPolicyEvaluation(
                    null,
                    DEFAULT_NO_SHOW_REFUND_PERCENTAGE,
                    roundAmount(paidAmount),
                    -1);
        }

        Date now = new Date();
        Date startTime = show.getStartTime();
        if (!startTime.after(now)) {
            throw new RefundNotAllowedException(
                    "Refund is not allowed after the show has started (show start: " + startTime + ")");
        }

        long hoursUntilShow = Math.max(0, Duration.between(now.toInstant(), startTime.toInstant()).toHours());
        CancellationPolicy policy = resolvePolicy(hoursUntilShow);
        int refundPercentage = policy == null ? 0 : policy.getRefundPercentage();
        double refundAmount = roundAmount(paidAmount * refundPercentage / 100.0);

        return new CancellationPolicyEvaluation(policy, refundPercentage, refundAmount, hoursUntilShow);
    }

    private CancellationPolicy resolvePolicy(long hoursUntilShow) {
        List<CancellationPolicy> policies = cancellationPolicyRepository.findAllByOrderByHoursBeforeShowDesc();
        for (CancellationPolicy policy : policies) {
            if (hoursUntilShow >= policy.getHoursBeforeShow()) {
                return policy;
            }
        }
        return null;
    }

    private double roundAmount(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }
}
