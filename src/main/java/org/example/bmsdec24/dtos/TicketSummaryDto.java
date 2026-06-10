package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.models.TicketStatus;

import java.util.Date;

public class TicketSummaryDto {
    private int ticketId;
    private String bookingReference;
    private String qrPayload;
    private TicketStatus status;
    private Date issuedAt;

    public static TicketSummaryDto from(Ticket ticket) {
        if (ticket == null) {
            return null;
        }
        TicketSummaryDto dto = new TicketSummaryDto();
        dto.setTicketId(ticket.getId());
        dto.setBookingReference(ticket.getBookingReference());
        dto.setQrPayload(ticket.getQrPayload());
        dto.setStatus(ticket.getStatus());
        dto.setIssuedAt(ticket.getIssuedAt());
        return dto;
    }

    public static TicketSummaryDto from(TicketResponseDto ticket) {
        if (ticket == null) {
            return null;
        }
        TicketSummaryDto dto = new TicketSummaryDto();
        dto.setTicketId(ticket.getId());
        dto.setBookingReference(ticket.getBookingReference());
        dto.setQrPayload(ticket.getQrPayload());
        dto.setStatus(ticket.getStatus());
        dto.setIssuedAt(ticket.getIssuedAt());
        return dto;
    }

    public int getTicketId() {
        return ticketId;
    }

    public void setTicketId(int ticketId) {
        this.ticketId = ticketId;
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
}
