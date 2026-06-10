package org.example.bmsdec24.services;

import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingEvent;
import org.example.bmsdec24.models.BookingEventType;

import java.util.List;

public interface BookingEventService {

    void recordEvent(Booking booking, BookingEventType eventType);

    List<BookingEvent> listEventsForBooking(int bookingId);
}
