package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.BookSeatsRequestDto;
import org.example.bmsdec24.dtos.BookShowSeatsRequestDto;
import org.example.bmsdec24.dtos.BookingEventResponseDto;
import org.example.bmsdec24.dtos.BookingResponseDto;
import org.example.bmsdec24.dtos.TicketResponseDto;
import org.example.bmsdec24.exceptions.AccessDeniedException;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SeatsNotAvailableException;
import org.example.bmsdec24.exceptions.TicketNotFoundException;
import org.example.bmsdec24.security.AuthenticatedUser;
import org.example.bmsdec24.security.BookingAccessService;
import org.example.bmsdec24.security.SecurityUtils;
import org.example.bmsdec24.services.BookingEventService;
import org.example.bmsdec24.services.BookingService;
import org.example.bmsdec24.services.TicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingRestController {

    private final BookingService bookingService;
    private final BookingAccessService bookingAccessService;
    private final TicketService ticketService;
    private final BookingEventService bookingEventService;

    public BookingRestController(BookingService bookingService,
                                 BookingAccessService bookingAccessService,
                                 TicketService ticketService,
                                 BookingEventService bookingEventService) {
        this.bookingService = bookingService;
        this.bookingAccessService = bookingAccessService;
        this.ticketService = ticketService;
        this.bookingEventService = bookingEventService;
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponseDto> getBooking(@PathVariable int bookingId)
            throws InvalidRequestException, InvalidBookingException, AccessDeniedException {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireBookingAccess(bookingId, currentUser);
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.getBooking(bookingId)));
    }

    @PostMapping("/book")
    public ResponseEntity<BookingResponseDto> bookSeats(@RequestBody BookSeatsRequestDto requestDto)
            throws InvalidUserException, SeatsNotAvailableException, InvalidRequestException, AccessDeniedException {
        validateBookRequest(requestDto);
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.bookSeats(
                currentUser.getUserId(),
                requestDto.getMovieId(),
                requestDto.getSeatIds())));
    }

    @PostMapping("/book-show-seats")
    public ResponseEntity<BookingResponseDto> bookShowSeats(@RequestBody BookShowSeatsRequestDto requestDto)
            throws InvalidUserException, SeatsNotAvailableException, InvalidRequestException, AccessDeniedException {
        validateBookShowSeatsRequest(requestDto);
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.bookShowSeats(
                currentUser.getUserId(),
                requestDto.getShowSeatIds())));
    }

    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingResponseDto> confirmBooking(@PathVariable int bookingId)
            throws Exception {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireBookingAccess(bookingId, currentUser);
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.confirmBooking(bookingId)));
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(@PathVariable int bookingId)
            throws Exception {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireBookingAccess(bookingId, currentUser);
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.cancelBooking(bookingId)));
    }

    @GetMapping("/{bookingId}/ticket")
    public ResponseEntity<TicketResponseDto> getTicket(@PathVariable int bookingId)
            throws InvalidRequestException, TicketNotFoundException, AccessDeniedException {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireBookingAccess(bookingId, currentUser);
        return ResponseEntity.ok(ticketService.getTicketForBooking(bookingId));
    }

    @PostMapping("/{bookingId}/issue-ticket")
    public ResponseEntity<TicketResponseDto> issueTicket(@PathVariable int bookingId)
            throws InvalidRequestException, InvalidTicketException, AccessDeniedException {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireBookingAccess(bookingId, currentUser);
        return ResponseEntity.ok(ticketService.issueTicket(bookingId));
    }

    @GetMapping("/{bookingId}/events")
    public ResponseEntity<List<BookingEventResponseDto>> listBookingEvents(@PathVariable int bookingId)
            throws InvalidRequestException, InvalidBookingException, AccessDeniedException {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireBookingAccess(bookingId, currentUser);
        bookingService.getBooking(bookingId);
        return ResponseEntity.ok(BookingEventResponseDto.fromList(
                bookingEventService.listEventsForBooking(bookingId)));
    }

    @PostMapping("/cleanup-expired")
    public ResponseEntity<Integer> releaseExpiredBookings() throws AccessDeniedException {
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireOperationalRole(currentUser);
        return ResponseEntity.ok(bookingService.releaseExpiredPendingBookings());
    }

    private void validateBookRequest(BookSeatsRequestDto requestDto) throws InvalidRequestException {
        if (requestDto == null) {
            throw new InvalidRequestException("Request body is required with movieId and seatIds");
        }
        if (requestDto.getMovieId() <= 0) {
            throw new InvalidRequestException("movieId must be a positive integer");
        }
        if (requestDto.getSeatIds() == null || requestDto.getSeatIds().isEmpty()) {
            throw new InvalidRequestException("seatIds must contain at least one seat id");
        }
    }

    private void validateBookShowSeatsRequest(BookShowSeatsRequestDto requestDto) throws InvalidRequestException {
        if (requestDto == null) {
            throw new InvalidRequestException("Request body is required with showSeatIds");
        }
        if (requestDto.getShowSeatIds() == null || requestDto.getShowSeatIds().isEmpty()) {
            throw new InvalidRequestException("showSeatIds must contain at least one show seat id");
        }
    }
}
