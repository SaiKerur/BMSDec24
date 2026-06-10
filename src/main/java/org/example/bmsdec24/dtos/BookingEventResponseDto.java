package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.BookingEvent;
import org.example.bmsdec24.models.BookingEventType;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

public class BookingEventResponseDto {

    private int id;
    private int bookingId;
    private BookingEventType eventType;
    private Date createdAt;

    public static BookingEventResponseDto from(BookingEvent event) {
        BookingEventResponseDto dto = new BookingEventResponseDto();
        dto.setId(event.getId());
        dto.setBookingId(event.getBooking().getId());
        dto.setEventType(event.getEventType());
        dto.setCreatedAt(event.getCreatedAt());
        return dto;
    }

    public static List<BookingEventResponseDto> fromList(List<BookingEvent> events) {
        return events.stream().map(BookingEventResponseDto::from).collect(Collectors.toList());
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getBookingId() {
        return bookingId;
    }

    public void setBookingId(int bookingId) {
        this.bookingId = bookingId;
    }

    public BookingEventType getEventType() {
        return eventType;
    }

    public void setEventType(BookingEventType eventType) {
        this.eventType = eventType;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }
}
