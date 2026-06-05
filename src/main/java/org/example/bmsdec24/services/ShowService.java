package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.ShowAvailabilityResponseDto;
import org.example.bmsdec24.dtos.ShowResponseDto;
import org.example.bmsdec24.exceptions.ResourceNotFoundException;

import java.util.Date;
import java.util.List;

public interface ShowService {

    List<ShowResponseDto> listShowsByTheatre(int theatreId) throws ResourceNotFoundException;

    List<ShowResponseDto> listShowsByMovie(int movieId) throws ResourceNotFoundException;

    ShowAvailabilityResponseDto getShowAvailability(int showId, Date changedAfter) throws ResourceNotFoundException;
}
