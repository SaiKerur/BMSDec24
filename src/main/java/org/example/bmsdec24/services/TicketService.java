package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.ShowAvailabilityResponseDto;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SomeOrAllSeatsAreUnavailable;
import org.example.bmsdec24.exceptions.TicketAlreadyProcessedException;
import org.example.bmsdec24.models.Ticket;

import java.util.Date;
import java.util.List;

public interface TicketService {

    Ticket bookTicket(int userId, List<Integer> showSeatId) throws InvalidUserException, SomeOrAllSeatsAreUnavailable;

    Ticket confirmTicket(int ticketId) throws InvalidTicketException, SomeOrAllSeatsAreUnavailable, TicketAlreadyProcessedException;

    Ticket cancelTicket(int ticketId) throws InvalidTicketException;

    ShowAvailabilityResponseDto getShowAvailability(int showId, Date changedAfter);

    int releaseExpiredPendingTickets();
}
