package org.example.bmsdec24.models;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity(name = "booking_events")
public class BookingEvent extends BaseModel {

    @ManyToOne(optional = false)
    @JoinColumn(name = "booking_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    private BookingEventType eventType;

    public Booking getBooking() {
        return booking;
    }

    public void setBooking(Booking booking) {
        this.booking = booking;
    }

    public BookingEventType getEventType() {
        return eventType;
    }

    public void setEventType(BookingEventType eventType) {
        this.eventType = eventType;
    }
}
