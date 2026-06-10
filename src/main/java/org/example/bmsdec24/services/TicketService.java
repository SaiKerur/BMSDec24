package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.TicketResponseDto;
import org.example.bmsdec24.dtos.TicketValidationResponseDto;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.TicketNotFoundException;

public interface TicketService {

    TicketResponseDto issueTicket(int bookingId) throws InvalidTicketException;

    TicketResponseDto getTicketForBooking(int bookingId) throws TicketNotFoundException;

    TicketValidationResponseDto validateTicket(String qrPayload, String bookingReference)
            throws InvalidTicketException, TicketNotFoundException;

    void revokeTicketForBooking(int bookingId);
}
