package org.example.bmsdec24.exceptions;

public class BookingAlreadyProcessedException extends Exception {
    public BookingAlreadyProcessedException(String message) {
        super(message);
    }
}
