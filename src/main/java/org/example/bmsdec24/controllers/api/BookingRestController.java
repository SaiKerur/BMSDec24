package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.BookSeatsRequestDto;
import org.example.bmsdec24.dtos.BookingResponseDto;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SeatsNotAvailableException;
import org.example.bmsdec24.services.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingRestController {

    private final BookingService bookingService;

    public BookingRestController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponseDto> getBooking(@PathVariable int bookingId)
            throws InvalidRequestException, InvalidBookingException {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.getBooking(bookingId)));
    }

    @PostMapping("/book")
    public ResponseEntity<BookingResponseDto> bookSeats(@RequestBody BookSeatsRequestDto requestDto)
            throws InvalidUserException, SeatsNotAvailableException, InvalidRequestException {
        validateBookRequest(requestDto);
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.bookSeats(
                requestDto.getUserId(),
                requestDto.getMovieId(),
                requestDto.getSeatIds())));
    }

    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingResponseDto> confirmBooking(@PathVariable int bookingId)
            throws Exception {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.confirmBooking(bookingId)));
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(@PathVariable int bookingId)
            throws Exception {
        if (bookingId <= 0) {
            throw new InvalidRequestException("bookingId must be a positive integer");
        }
        return ResponseEntity.ok(BookingResponseDto.from(bookingService.cancelBooking(bookingId)));
    }

    @PostMapping("/cleanup-expired")
    public ResponseEntity<Integer> releaseExpiredBookings() {
        return ResponseEntity.ok(bookingService.releaseExpiredPendingBookings());
    }

    private void validateBookRequest(BookSeatsRequestDto requestDto) throws InvalidRequestException {
        if (requestDto == null) {
            throw new InvalidRequestException("Request body is required with userId, movieId, and seatIds");
        }
        if (requestDto.getUserId() <= 0) {
            throw new InvalidRequestException("userId must be a positive integer");
        }
        if (requestDto.getMovieId() <= 0) {
            throw new InvalidRequestException("movieId must be a positive integer");
        }
        if (requestDto.getSeatIds() == null || requestDto.getSeatIds().isEmpty()) {
            throw new InvalidRequestException("seatIds must contain at least one seat id");
        }
    }
}
