package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.ShowAvailabilityResponseDto;
import org.example.bmsdec24.dtos.ShowResponseDto;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.ResourceNotFoundException;
import org.example.bmsdec24.services.ShowService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/shows")
public class ShowRestController {

    private final ShowService showService;

    public ShowRestController(ShowService showService) {
        this.showService = showService;
    }

    @GetMapping("/theatres/{theatreId}")
    public ResponseEntity<List<ShowResponseDto>> listShowsByTheatre(@PathVariable int theatreId)
            throws ResourceNotFoundException, InvalidRequestException {
        validatePositiveId(theatreId, "theatreId");
        return ResponseEntity.ok(showService.listShowsByTheatre(theatreId));
    }

    @GetMapping("/movies/{movieId}")
    public ResponseEntity<List<ShowResponseDto>> listShowsByMovie(@PathVariable int movieId)
            throws ResourceNotFoundException, InvalidRequestException {
        validatePositiveId(movieId, "movieId");
        return ResponseEntity.ok(showService.listShowsByMovie(movieId));
    }

    @GetMapping("/{showId}/availability")
    public ResponseEntity<ShowAvailabilityResponseDto> getShowAvailability(
            @PathVariable int showId,
            @RequestParam(required = false) Long changedAfterEpochMs)
            throws ResourceNotFoundException, InvalidRequestException {
        validatePositiveId(showId, "showId");
        Date changedAfter = changedAfterEpochMs == null ? null : new Date(changedAfterEpochMs);
        return ResponseEntity.ok(showService.getShowAvailability(showId, changedAfter));
    }

    private void validatePositiveId(int id, String fieldName) throws InvalidRequestException {
        if (id <= 0) {
            throw new InvalidRequestException(fieldName + " must be a positive integer");
        }
    }
}
