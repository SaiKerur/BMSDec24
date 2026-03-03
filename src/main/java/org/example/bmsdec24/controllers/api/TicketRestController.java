package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.BookTicketRequestDto;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SomeOrAllSeatsAreUnavailable;
import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.services.TicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}

