package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.PaymentProviderOptionDto;
import org.example.bmsdec24.dtos.PaymentResponseDto;

import java.util.List;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
import org.example.bmsdec24.exceptions.PaymentAlreadyProcessedException;
import org.example.bmsdec24.models.PaymentProvider;

public interface PaymentService {

    List<PaymentProviderOptionDto> listAvailableProviders();

    PaymentResponseDto initiatePayment(int bookingId, PaymentProvider provider)
            throws InvalidPaymentException;

    PaymentResponseDto completePayment(int paymentId, String paymentReference, String signature, boolean reportedSuccess)
            throws InvalidPaymentException, PaymentAlreadyProcessedException;

    PaymentResponseDto getPayment(int paymentId) throws InvalidPaymentException;
}
