package org.example.bmsdec24.services;

import org.example.bmsdec24.exceptions.BookingAlreadyProcessedException;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SeatsNotAvailableException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.Movie;
import org.example.bmsdec24.models.Seat;
import org.example.bmsdec24.models.SeatStatus;
import org.example.bmsdec24.models.Theatre;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.repos.BookingRepository;
import org.example.bmsdec24.repos.MovieRepository;
import org.example.bmsdec24.repos.SeatRepository;
import org.example.bmsdec24.repos.TheatreRepository;
import org.example.bmsdec24.repos.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class BookingServiceImpl implements BookingService {

    private static final Duration BOOKING_HOLD_DURATION = Duration.ofMinutes(5);

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final TheatreRepository theatreRepository;
    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;

    public BookingServiceImpl(UserRepository userRepository,
                              MovieRepository movieRepository,
                              TheatreRepository theatreRepository,
                              SeatRepository seatRepository,
                              BookingRepository bookingRepository) {
        this.userRepository = userRepository;
        this.movieRepository = movieRepository;
        this.theatreRepository = theatreRepository;
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public Booking bookSeats(int userId, int movieId, List<Integer> seatIds)
            throws InvalidUserException, SeatsNotAvailableException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidUserException("No user found with id: " + userId));
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new SeatsNotAvailableException("No movie found with id: " + movieId));

        List<Seat> seats = lockAndValidateSeats(seatIds, movieId);

        Theatre theatre = seats.get(0).getTheatre();
        seats.forEach(seat -> {
            seat.setSeatStatus(SeatStatus.BLOCKED);
            seat.setBookedBy(user);
            seat.syncDenormalizedNames();
        });
        seatRepository.saveAll(seats);

        double totalAmount = seats.stream().mapToDouble(Seat::getPrice).sum();

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setMovie(movie);
        booking.setTheatre(theatre);
        booking.syncDenormalizedNames();
        booking.setSeats(seats);
        booking.setStatus(BookingStatus.PENDING);
        booking.setTotalAmount(totalAmount);
        booking.setHoldExpiresAt(Date.from(new Date().toInstant().plus(BOOKING_HOLD_DURATION)));

        Booking saved = bookingRepository.save(booking);
        return bookingRepository.findDetailedById(saved.getId()).orElse(saved);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public Booking confirmBooking(int bookingId)
            throws InvalidBookingException, SeatsNotAvailableException, BookingAlreadyProcessedException {
        Booking booking = loadBooking(bookingId);

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            throw new BookingAlreadyProcessedException(
                    "Booking " + bookingId + " is already CONFIRMED and cannot be confirmed again");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BookingAlreadyProcessedException(
                    "Booking " + bookingId + " is CANCELLED and cannot be confirmed");
        }

        Date now = new Date();
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().before(now)) {
            expirePendingBooking(booking);
            throw new SeatsNotAvailableException(
                    "Booking " + bookingId + " hold expired. Please create a new booking with POST /api/bookings/book");
        }

        for (Seat seat : booking.getSeats()) {
            boolean valid = seat.getSeatStatus() == SeatStatus.BLOCKED
                    && seat.getBookedBy() != null
                    && seat.getBookedBy().getId() == booking.getUser().getId();
            if (!valid) {
                throw new SeatsNotAvailableException(
                        "Seat " + seat.getId() + " is not BLOCKED for user "
                                + booking.getUser().getId() + " on booking " + bookingId);
            }
        }

        booking.getSeats().forEach(seat -> {
            seat.setSeatStatus(SeatStatus.BOOKED);
            seat.syncDenormalizedNames();
        });
        seatRepository.saveAll(booking.getSeats());

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setHoldExpiresAt(null);
        Booking saved = bookingRepository.save(booking);
        return bookingRepository.findDetailedById(saved.getId()).orElse(saved);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public Booking cancelBooking(int bookingId) throws InvalidBookingException {
        Booking booking = loadBooking(bookingId);
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return booking;
        }
        releaseSeats(booking.getSeats());
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setHoldExpiresAt(null);
        Booking saved = bookingRepository.save(booking);
        return bookingRepository.findDetailedById(saved.getId()).orElse(saved);
    }

    @Override
    public Booking getBooking(int bookingId) throws InvalidBookingException {
        return loadBooking(bookingId);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public int releaseExpiredPendingBookings() {
        List<Booking> expired = bookingRepository.findAllByStatusAndHoldExpiresAtBefore(
                BookingStatus.PENDING, new Date());
        for (Booking booking : expired) {
            expirePendingBooking(booking);
        }
        return expired.size();
    }

    private List<Seat> lockAndValidateSeats(List<Integer> seatIds, int movieId) throws SeatsNotAvailableException {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new SeatsNotAvailableException("At least one seatId is required to create a booking");
        }

        Set<Integer> uniqueIds = new LinkedHashSet<>(seatIds);
        if (uniqueIds.size() != seatIds.size()) {
            throw new SeatsNotAvailableException("seatIds must not contain duplicates");
        }

        List<Seat> seats = seatRepository.findAllByIdIn(uniqueIds.stream().toList());
        if (seats.size() != uniqueIds.size()) {
            throw new SeatsNotAvailableException("One or more seatIds do not exist: " + seatIds);
        }

        int theatreId = seats.get(0).getTheatre().getId();
        boolean multipleTheatres = seats.stream().anyMatch(s -> s.getTheatre().getId() != theatreId);
        if (multipleTheatres) {
            throw new SeatsNotAvailableException("All seatIds must belong to the same theatre");
        }

        Theatre theatre = theatreRepository.findWithMoviesById(theatreId)
                .orElseThrow(() -> new SeatsNotAvailableException("No theatre found with id: " + theatreId));
        boolean movieRunning = theatre.getMovies() != null
                && theatre.getMovies().stream().anyMatch(m -> m.getId() == movieId);
        if (!movieRunning) {
            throw new SeatsNotAvailableException(
                    "Movie " + movieId + " is not running in theatre " + theatreId + " (" + theatre.getName() + ")");
        }

        List<Integer> unavailable = seats.stream()
                .filter(s -> !isSeatAvailable(s))
                .map(Seat::getId)
                .toList();
        if (!unavailable.isEmpty()) {
            throw new SeatsNotAvailableException(
                    "Seats are not AVAILABLE (may be BLOCKED or BOOKED): " + unavailable);
        }

        return seats;
    }

    private Booking loadBooking(int bookingId) throws InvalidBookingException {
        return bookingRepository.findDetailedById(bookingId)
                .orElseThrow(() -> new InvalidBookingException("No booking found with id: " + bookingId));
    }

    private void expirePendingBooking(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            return;
        }
        releaseSeats(booking.getSeats());
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setHoldExpiresAt(null);
        bookingRepository.save(booking);
    }

    private void releaseSeats(List<Seat> seats) {
        seats.forEach(seat -> {
            seat.setSeatStatus(SeatStatus.AVAILABLE);
            seat.setBookedBy(null);
            seat.setBookedByUserName(null);
        });
        seatRepository.saveAll(seats);
    }

    private boolean isSeatAvailable(Seat seat) {
        return seat.getSeatStatus() == null || seat.getSeatStatus() == SeatStatus.AVAILABLE;
    }
}
