package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.RefundResponseDto;
import org.example.bmsdec24.exceptions.InvalidRefundException;
import org.example.bmsdec24.exceptions.RefundAlreadyProcessedException;
import org.example.bmsdec24.exceptions.RefundNotAllowedException;

public interface RefundService {

    RefundResponseDto processRefund(int bookingId, String reason)
            throws InvalidRefundException, RefundNotAllowedException, RefundAlreadyProcessedException;

    RefundResponseDto getRefund(int refundId) throws InvalidRefundException;
}
