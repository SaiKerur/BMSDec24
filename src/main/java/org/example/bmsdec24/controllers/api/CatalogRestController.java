package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.CityResponseDto;
import org.example.bmsdec24.dtos.MovieResponseDto;
import org.example.bmsdec24.dtos.SeatResponseDto;
import org.example.bmsdec24.dtos.TheatreDetailResponseDto;
import org.example.bmsdec24.dtos.TheatreResponseDto;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.ResourceNotFoundException;
import org.example.bmsdec24.models.Genre;
import org.example.bmsdec24.services.CatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
public class CatalogRestController {

    private final CatalogService catalogService;

    public CatalogRestController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/cities")
    public ResponseEntity<List<CityResponseDto>> listCities() {
        return ResponseEntity.ok(catalogService.listCities());
    }

    @GetMapping("/cities/{cityId}/theatres")
    public ResponseEntity<List<TheatreResponseDto>> listTheatresByCity(@PathVariable int cityId)
            throws ResourceNotFoundException, InvalidRequestException {
        validatePositiveId(cityId, "cityId");
        return ResponseEntity.ok(catalogService.listTheatresByCity(cityId));
    }

    @GetMapping("/theatres/{theatreId}")
    public ResponseEntity<TheatreDetailResponseDto> getTheatre(@PathVariable int theatreId)
            throws ResourceNotFoundException, InvalidRequestException {
        validatePositiveId(theatreId, "theatreId");
        return ResponseEntity.ok(catalogService.getTheatre(theatreId));
    }

    @GetMapping("/movies")
    public ResponseEntity<List<MovieResponseDto>> listMovies(@RequestParam(required = false) Genre genre) {
        return ResponseEntity.ok(catalogService.listMovies(genre));
    }

    @GetMapping("/theatres/{theatreId}/seats")
    public ResponseEntity<List<SeatResponseDto>> listSeatsByTheatre(@PathVariable int theatreId)
            throws ResourceNotFoundException, InvalidRequestException {
        validatePositiveId(theatreId, "theatreId");
        return ResponseEntity.ok(catalogService.listSeatsByTheatre(theatreId));
    }

    private void validatePositiveId(int id, String fieldName) throws InvalidRequestException {
        if (id <= 0) {
            throw new InvalidRequestException(fieldName + " must be a positive integer");
        }
    }
}
