package org.example.bmsdec24.services;

import org.example.bmsdec24.exceptions.RefundNotAllowedException;
import org.example.bmsdec24.models.Booking;

public interface CancellationPolicyService {

    CancellationPolicyEvaluation evaluate(Booking booking, double paidAmount) throws RefundNotAllowedException;
}
