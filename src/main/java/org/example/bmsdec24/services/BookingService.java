package org.example.bmsdec24.services;

import org.example.bmsdec24.exceptions.BookingAlreadyProcessedException;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SeatsNotAvailableException;
import org.example.bmsdec24.models.Booking;

import java.util.List;

public interface BookingService {

    Booking bookSeats(int userId, int movieId, List<Integer> seatIds)
            throws InvalidUserException, SeatsNotAvailableException;

    Booking bookShowSeats(int userId, List<Integer> showSeatIds)
            throws InvalidUserException, SeatsNotAvailableException;

    Booking confirmBooking(int bookingId)
            throws InvalidBookingException, SeatsNotAvailableException, BookingAlreadyProcessedException;

    Booking cancelBooking(int bookingId) throws InvalidBookingException;

    int releaseExpiredPendingBookings();

    Booking getBooking(int bookingId) throws InvalidBookingException;
}
