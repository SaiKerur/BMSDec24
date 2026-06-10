package org.example.bmsdec24.services;

import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingEvent;
import org.example.bmsdec24.models.BookingEventType;
import org.example.bmsdec24.repos.BookingEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookingEventServiceImpl implements BookingEventService {

    private final BookingEventRepository bookingEventRepository;

    public BookingEventServiceImpl(BookingEventRepository bookingEventRepository) {
        this.bookingEventRepository = bookingEventRepository;
    }

    @Transactional
    @Override
    public void recordEvent(Booking booking, BookingEventType eventType) {
        BookingEvent event = new BookingEvent();
        event.setBooking(booking);
        event.setEventType(eventType);
        bookingEventRepository.save(event);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingEvent> listEventsForBooking(int bookingId) {
        return bookingEventRepository.findAllByBooking_IdOrderByCreatedAtAsc(bookingId);
    }
}
