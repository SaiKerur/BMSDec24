package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.ShowAvailabilityResponseDto;
import org.example.bmsdec24.dtos.ShowResponseDto;
import org.example.bmsdec24.dtos.ShowSeatLiveStatusDto;
import org.example.bmsdec24.exceptions.ResourceNotFoundException;
import org.example.bmsdec24.models.SeatStatus;
import org.example.bmsdec24.models.ShowSeat;
import org.example.bmsdec24.repos.ShowRepository;
import org.example.bmsdec24.repos.ShowSeatRepository;
import org.example.bmsdec24.repos.TheatreRepository;
import org.example.bmsdec24.repos.MovieRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
public class ShowServiceImpl implements ShowService {

    private final ShowRepository showRepository;
    private final ShowSeatRepository showSeatRepository;
    private final TheatreRepository theatreRepository;
    private final MovieRepository movieRepository;

    public ShowServiceImpl(ShowRepository showRepository,
                           ShowSeatRepository showSeatRepository,
                           TheatreRepository theatreRepository,
                           MovieRepository movieRepository) {
        this.showRepository = showRepository;
        this.showSeatRepository = showSeatRepository;
        this.theatreRepository = theatreRepository;
        this.movieRepository = movieRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShowResponseDto> listShowsByTheatre(int theatreId) throws ResourceNotFoundException {
        requireTheatre(theatreId);
        return showRepository.findAllByScreen_Theatre_Id(theatreId).stream()
                .map(ShowResponseDto::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShowResponseDto> listShowsByMovie(int movieId) throws ResourceNotFoundException {
        requireMovie(movieId);
        return showRepository.findAllByMovie_Id(movieId).stream()
                .map(ShowResponseDto::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ShowAvailabilityResponseDto getShowAvailability(int showId, Date changedAfter)
            throws ResourceNotFoundException {
        requireShow(showId);

        long available = showSeatRepository.countByShow_IdAndSeatStatus(showId, SeatStatus.AVAILABLE);
        long blocked = showSeatRepository.countByShow_IdAndSeatStatus(showId, SeatStatus.BLOCKED);
        long booked = showSeatRepository.countByShow_IdAndSeatStatus(showId, SeatStatus.BOOKED);

        List<ShowSeat> showSeats = changedAfter == null
                ? showSeatRepository.findAllByShow_IdOrderByIdAsc(showId)
                : showSeatRepository.findAllByShow_IdAndUpdatedAtAfterOrderByUpdatedAtAsc(showId, changedAfter);

        ShowAvailabilityResponseDto response = new ShowAvailabilityResponseDto();
        response.setShowId(showId);
        response.setAvailableSeats(available);
        response.setBlockedSeats(blocked);
        response.setBookedSeats(booked);
        response.setTotalSeats((int) (available + blocked + booked));
        response.setServerTimeEpochMs(System.currentTimeMillis());
        response.setSeats(showSeats.stream().map(this::toLiveStatus).toList());
        return response;
    }

    private ShowSeatLiveStatusDto toLiveStatus(ShowSeat showSeat) {
        ShowSeatLiveStatusDto dto = new ShowSeatLiveStatusDto();
        dto.setShowSeatId(showSeat.getId());
        dto.setSeatId(showSeat.getSeat().getId());
        dto.setSeatNumber(showSeat.getSeat().getSeatNumber());
        dto.setSeatStatus(showSeat.getSeatStatus());
        dto.setPrice(showSeat.getSeat().getPrice());
        dto.setSeatType(showSeat.getSeat().getSeatType());
        dto.setUpdatedAtEpochMs(showSeat.getUpdatedAt() == null ? 0 : showSeat.getUpdatedAt().getTime());
        return dto;
    }

    private void requireTheatre(int theatreId) throws ResourceNotFoundException {
        if (!theatreRepository.existsById(theatreId)) {
            throw new ResourceNotFoundException("No theatre found with id: " + theatreId);
        }
    }

    private void requireMovie(int movieId) throws ResourceNotFoundException {
        if (!movieRepository.existsById(movieId)) {
            throw new ResourceNotFoundException("No movie found with id: " + movieId);
        }
    }

    private void requireShow(int showId) throws ResourceNotFoundException {
        if (!showRepository.existsById(showId)) {
            throw new ResourceNotFoundException("No show found with id: " + showId);
        }
    }
}
