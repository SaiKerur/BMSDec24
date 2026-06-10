package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.models.TicketStatus;

import java.util.Date;

public class TicketResponseDto {
    private int id;
    private int bookingId;
    private String bookingReference;
    private String qrPayload;
    private TicketStatus status;
    private Date issuedAt;
    private Date validatedAt;
    private String movieName;
    private String theatreName;
    private int seatCount;

    public static TicketResponseDto from(Ticket ticket) {
        TicketResponseDto dto = new TicketResponseDto();
        dto.setId(ticket.getId());
        if (ticket.getBooking() != null) {
            dto.setBookingId(ticket.getBooking().getId());
            dto.setMovieName(ticket.getBooking().getMovieName());
            dto.setTheatreName(ticket.getBooking().getTheatreName());
            if (ticket.getBooking().getSeats() != null) {
                dto.setSeatCount(ticket.getBooking().getSeats().size());
            }
        }
        dto.setBookingReference(ticket.getBookingReference());
        dto.setQrPayload(ticket.getQrPayload());
        dto.setStatus(ticket.getStatus());
        dto.setIssuedAt(ticket.getIssuedAt());
        dto.setValidatedAt(ticket.getValidatedAt());
        return dto;
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

    public String getBookingReference() {
        return bookingReference;
    }

    public void setBookingReference(String bookingReference) {
        this.bookingReference = bookingReference;
    }

    public String getQrPayload() {
        return qrPayload;
    }

    public void setQrPayload(String qrPayload) {
        this.qrPayload = qrPayload;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public Date getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Date issuedAt) {
        this.issuedAt = issuedAt;
    }

    public Date getValidatedAt() {
        return validatedAt;
    }

    public void setValidatedAt(Date validatedAt) {
        this.validatedAt = validatedAt;
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
}
