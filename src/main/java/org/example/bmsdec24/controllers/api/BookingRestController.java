package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.BookSeatsRequestDto;
import org.example.bmsdec24.dtos.BookingResponseDto;
import org.example.bmsdec24.exceptions.BookingAlreadyProcessedException;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SeatsNotAvailableException;
import org.example.bmsdec24.services.BookingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @PostMapping("/book")
    public ResponseEntity<BookingResponseDto> bookSeats(@RequestBody BookSeatsRequestDto requestDto) {
        try {
            if (requestDto == null
                    || requestDto.getUserId() <= 0
                    || requestDto.getMovieId() <= 0
                    || requestDto.getSeatIds() == null
                    || requestDto.getSeatIds().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            return ResponseEntity.ok(BookingResponseDto.from(bookingService.bookSeats(
                    requestDto.getUserId(),
                    requestDto.getMovieId(),
                    requestDto.getSeatIds())));
        } catch (InvalidUserException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (SeatsNotAvailableException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingResponseDto> confirmBooking(@PathVariable int bookingId) {
        try {
            return ResponseEntity.ok(BookingResponseDto.from(bookingService.confirmBooking(bookingId)));
        } catch (InvalidBookingException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (BookingAlreadyProcessedException | SeatsNotAvailableException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(@PathVariable int bookingId) {
        try {
            return ResponseEntity.ok(BookingResponseDto.from(bookingService.cancelBooking(bookingId)));
        } catch (InvalidBookingException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/cleanup-expired")
    public ResponseEntity<Integer> releaseExpiredBookings() {
        return ResponseEntity.ok(bookingService.releaseExpiredPendingBookings());
    }
}
