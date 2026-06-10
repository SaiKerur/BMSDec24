package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.TicketStatus;

import java.util.Date;

public class TicketValidationResponseDto {
    private boolean valid;
    private TicketStatus status;
    private String bookingReference;
    private int bookingId;
    private String movieName;
    private String theatreName;
    private int seatCount;
    private Date validatedAt;
    private String message;

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public String getBookingReference() {
        return bookingReference;
    }

    public void setBookingReference(String bookingReference) {
        this.bookingReference = bookingReference;
    }

    public int getBookingId() {
        return bookingId;
    }

    public void setBookingId(int bookingId) {
        this.bookingId = bookingId;
    }

    public String getMovieName() {
        return movieName;
    }

    public void setMovieName(String movieName) {
        this.movieName = movieName;
    }

    public String getTheatreName() {
        return theatreName;
    }

    public void setTheatreName(String theatreName) {
        this.theatreName = theatreName;
    }

    public int getSeatCount() {
        return seatCount;
    }

    public void setSeatCount(int seatCount) {
        this.seatCount = seatCount;
    }

    public Date getValidatedAt() {
        return validatedAt;
    }

    public void setValidatedAt(Date validatedAt) {
        this.validatedAt = validatedAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
