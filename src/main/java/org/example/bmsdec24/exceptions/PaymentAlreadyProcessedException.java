package org.example.bmsdec24.exceptions;

public class PaymentAlreadyProcessedException extends Exception {
    public PaymentAlreadyProcessedException(String message) {
        super(message);
    }
}
