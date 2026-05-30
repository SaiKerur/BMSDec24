package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.PaymentResponseDto;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.PaymentAlreadyProcessedException;
import org.example.bmsdec24.models.PaymentProvider;

public interface PaymentService {

    /**
     * Creates a payment order/intent with the chosen provider for a PENDING ticket
     * and returns the checkout details the client uses to pay.
     */
    PaymentResponseDto initiatePayment(int ticketId, PaymentProvider provider)
            throws InvalidTicketException, InvalidPaymentException;

    /**
     * Verifies the provider callback and settles the booking: on success the ticket
     * is CONFIRMED, on failure it is CANCELLED.
     */
    PaymentResponseDto completePayment(int paymentId, String paymentReference, String signature, boolean reportedSuccess)
            throws InvalidPaymentException, PaymentAlreadyProcessedException;

    PaymentResponseDto getPayment(int paymentId) throws InvalidPaymentException;
}
