package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.BookTicketRequestDto;
import org.example.bmsdec24.dtos.ShowAvailabilityResponseDto;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SomeOrAllSeatsAreUnavailable;
import org.example.bmsdec24.exceptions.TicketAlreadyProcessedException;
import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.services.TicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Date;

@RestController
@RequestMapping("/api/tickets")
public class TicketRestController {

    private final TicketService ticketService;

    public TicketRestController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping("/book")
    public ResponseEntity<Ticket> bookTicket(@RequestBody BookTicketRequestDto requestDto) {
        try {
            if (requestDto.getUserId() <= 0 || requestDto.getShowSeatIds() == null || requestDto.getShowSeatIds().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            Ticket ticket = ticketService.bookTicket(requestDto.getUserId(), requestDto.getShowSeatIds());
            return ResponseEntity.ok(ticket);
        } catch (InvalidUserException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (SomeOrAllSeatsAreUnavailable e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{ticketId}/confirm")
    public ResponseEntity<Ticket> confirmTicket(@PathVariable int ticketId) {
        try {
            Ticket ticket = ticketService.confirmTicket(ticketId);
            return ResponseEntity.ok(ticket);
        } catch (InvalidTicketException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (TicketAlreadyProcessedException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (SomeOrAllSeatsAreUnavailable e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{ticketId}/cancel")
    public ResponseEntity<Ticket> cancelTicket(@PathVariable int ticketId) {
        try {
            Ticket ticket = ticketService.cancelTicket(ticketId);
            return ResponseEntity.ok(ticket);
        } catch (InvalidTicketException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/shows/{showId}/availability")
    public ResponseEntity<ShowAvailabilityResponseDto> getShowAvailability(@PathVariable int showId,
                                                                           @RequestParam(required = false) Long changedAfterEpochMs) {
        if (showId <= 0) {
            return ResponseEntity.badRequest().build();
        }

        Date changedAfter = changedAfterEpochMs == null ? null : new Date(changedAfterEpochMs);
        ShowAvailabilityResponseDto response = ticketService.getShowAvailability(showId, changedAfter);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup-expired")
    public ResponseEntity<Integer> releaseExpiredTicketHolds() {
        int releasedTickets = ticketService.releaseExpiredPendingTickets();
        return ResponseEntity.ok(releasedTickets);
    }
}

