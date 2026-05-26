package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.ShowAvailabilityResponseDto;
import org.example.bmsdec24.dtos.ShowSeatLiveStatusDto;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.InvalidUserException;
import org.example.bmsdec24.exceptions.SomeOrAllSeatsAreUnavailable;
import org.example.bmsdec24.exceptions.TicketAlreadyProcessedException;
import org.example.bmsdec24.models.*;
import org.example.bmsdec24.repos.ShowSeatRepository;
import org.example.bmsdec24.repos.TicketRepository;
import org.example.bmsdec24.repos.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TicketServiceImpl implements TicketService {

    private static final Duration TICKET_HOLD_DURATION = Duration.ofMinutes(5);

    private final UserRepository userRepository;

    private final ShowSeatRepository showSeatRepository;

    private final TicketRepository ticketRepository;

    public TicketServiceImpl(UserRepository userRepository, ShowSeatRepository showSeatRepository, TicketRepository ticketRepository) {
        this.userRepository = userRepository;
        this.showSeatRepository = showSeatRepository;
        this.ticketRepository = ticketRepository;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public Ticket bookTicket(int userId, List<Integer> showSeatIds) throws InvalidUserException, SomeOrAllSeatsAreUnavailable {
        User user = userRepository.findById(userId).orElseThrow(() -> new InvalidUserException("User not found"));
        List<ShowSeat> showSeats = lockAndValidateSeatsForBooking(showSeatIds);

        showSeats.forEach(showSeat -> {
            showSeat.setBookedBy(user);
            showSeat.setSeatStatus(SeatStatus.BLOCKED);
        });
        showSeatRepository.saveAll(showSeats);

        Ticket ticket = new Ticket();
        ticket.setUser(user);
        Show show = showSeats.get(0).getShow();
        ticket.setShow(show);
        ticket.setMovie(show.getMovie());
        ticket.setShowSeats(showSeats);
        ticket.setStatus(TicketStatus.PENDING);
        ticket.setHoldExpiresAt(Date.from(new Date().toInstant().plus(TICKET_HOLD_DURATION)));

        return ticketRepository.save(ticket);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public Ticket confirmTicket(int ticketId) throws InvalidTicketException, SomeOrAllSeatsAreUnavailable, TicketAlreadyProcessedException {
        Ticket ticket = loadTicketForUpdate(ticketId);
        if (ticket.getStatus() == TicketStatus.CONFIRMED) {
            throw new TicketAlreadyProcessedException("Ticket is already confirmed");
        }
        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new TicketAlreadyProcessedException("Ticket is already cancelled");
        }

        Date now = new Date();
        if (ticket.getHoldExpiresAt() != null && ticket.getHoldExpiresAt().before(now)) {
            expirePendingTicket(ticket);
            throw new SomeOrAllSeatsAreUnavailable("Ticket hold expired. Please book again.");
        }

        for (ShowSeat showSeat : ticket.getShowSeats()) {
            boolean validBlockedSeat = showSeat.getSeatStatus() == SeatStatus.BLOCKED
                    && showSeat.getBookedBy() != null
                    && showSeat.getBookedBy().getId() == ticket.getUser().getId();
            if (!validBlockedSeat) {
                throw new SomeOrAllSeatsAreUnavailable("Some seats are not blocked for this ticket anymore");
            }
        }

        ticket.getShowSeats().forEach(showSeat -> showSeat.setSeatStatus(SeatStatus.BOOKED));
        showSeatRepository.saveAll(ticket.getShowSeats());

        ticket.setStatus(TicketStatus.CONFIRMED);
        ticket.setHoldExpiresAt(null);
        return ticketRepository.save(ticket);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public Ticket cancelTicket(int ticketId) throws InvalidTicketException {
        Ticket ticket = loadTicketForUpdate(ticketId);
        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            return ticket;
        }

        releaseSeats(ticket.getShowSeats());
        ticket.setStatus(TicketStatus.CANCELLED);
        ticket.setHoldExpiresAt(null);
        return ticketRepository.save(ticket);
    }

    @Transactional(readOnly = true)
    @Override
    public ShowAvailabilityResponseDto getShowAvailability(int showId, Date changedAfter) {
        long available = showSeatRepository.countByShow_IdAndSeatStatus(showId, SeatStatus.AVAILABLE);
        long blocked = showSeatRepository.countByShow_IdAndSeatStatus(showId, SeatStatus.BLOCKED);
        long booked = showSeatRepository.countByShow_IdAndSeatStatus(showId, SeatStatus.BOOKED);

        List<ShowSeat> showSeats;
        if (changedAfter == null) {
            showSeats = showSeatRepository.findAllByShow_IdOrderByIdAsc(showId);
        } else {
            showSeats = showSeatRepository.findAllByShow_IdAndUpdatedAtAfterOrderByUpdatedAtAsc(showId, changedAfter);
        }

        List<ShowSeatLiveStatusDto> seatDtos = showSeats.stream()
                .map(this::convertToLiveStatus)
                .collect(Collectors.toList());

        ShowAvailabilityResponseDto responseDto = new ShowAvailabilityResponseDto();
        responseDto.setShowId(showId);
        responseDto.setAvailableSeats(available);
        responseDto.setBlockedSeats(blocked);
        responseDto.setBookedSeats(booked);
        responseDto.setTotalSeats((int) (available + blocked + booked));
        responseDto.setServerTimeEpochMs(System.currentTimeMillis());
        responseDto.setSeats(seatDtos);
        return responseDto;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public int releaseExpiredPendingTickets() {
        List<Ticket> expiredTickets = ticketRepository.findAllByStatusAndHoldExpiresAtBefore(TicketStatus.PENDING, new Date());
        for (Ticket expiredTicket : expiredTickets) {
            expirePendingTicket(expiredTicket);
        }
        return expiredTickets.size();
    }

    private List<ShowSeat> lockAndValidateSeatsForBooking(List<Integer> showSeatIds) throws SomeOrAllSeatsAreUnavailable {
        if (showSeatIds == null || showSeatIds.isEmpty()) {
            throw new SomeOrAllSeatsAreUnavailable("At least one show seat is required");
        }

        Set<Integer> uniqueIds = new LinkedHashSet<>(showSeatIds);
        if (uniqueIds.size() != showSeatIds.size()) {
            throw new SomeOrAllSeatsAreUnavailable("Duplicate seat IDs in request");
        }

        List<ShowSeat> showSeats = showSeatRepository.findAllByIdIn(uniqueIds.stream().toList());
        if (showSeats.size() != uniqueIds.size()) {
            throw new SomeOrAllSeatsAreUnavailable("Some requested show seats do not exist");
        }

        int showId = showSeats.get(0).getShow().getId();
        boolean multipleShowsSelected = showSeats.stream().anyMatch(showSeat -> showSeat.getShow().getId() != showId);
        if (multipleShowsSelected) {
            throw new SomeOrAllSeatsAreUnavailable("All seats must belong to the same show");
        }

        List<Integer> unavailableSeatIds = showSeats.stream()
                .filter(showSeat -> showSeat.getSeatStatus() != SeatStatus.AVAILABLE)
                .map(ShowSeat::getId)
                .toList();
        if (!unavailableSeatIds.isEmpty()) {
            throw new SomeOrAllSeatsAreUnavailable("Seats unavailable: " + unavailableSeatIds);
        }

        return showSeats;
    }

    private Ticket loadTicketForUpdate(int ticketId) throws InvalidTicketException {
        return ticketRepository.findDetailedById(ticketId).orElseThrow(() -> new InvalidTicketException("Ticket not found"));
    }

    private void expirePendingTicket(Ticket ticket) {
        if (ticket.getStatus() != TicketStatus.PENDING) {
            return;
        }
        releaseSeats(ticket.getShowSeats());
        ticket.setStatus(TicketStatus.CANCELLED);
        ticket.setHoldExpiresAt(null);
        ticketRepository.save(ticket);
    }

    private void releaseSeats(List<ShowSeat> showSeats) {
        showSeats.forEach(showSeat -> {
            showSeat.setSeatStatus(SeatStatus.AVAILABLE);
            showSeat.setBookedBy(null);
        });
        showSeatRepository.saveAll(showSeats);
    }

    private ShowSeatLiveStatusDto convertToLiveStatus(ShowSeat showSeat) {
        ShowSeatLiveStatusDto dto = new ShowSeatLiveStatusDto();
        dto.setShowSeatId(showSeat.getId());
        dto.setSeatId(showSeat.getSeat().getId());
        dto.setSeatName(showSeat.getSeat().getName());
        dto.setRowNum(showSeat.getSeat().getRowNum());
        dto.setColNum(showSeat.getSeat().getColNum());
        dto.setSeatStatus(showSeat.getSeatStatus());
        dto.setUpdatedAtEpochMs(showSeat.getUpdatedAt() == null ? 0 : showSeat.getUpdatedAt().getTime());
        return dto;
    }
}
