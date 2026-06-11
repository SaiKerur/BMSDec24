package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.CityResponseDto;
import org.example.bmsdec24.dtos.MovieResponseDto;
import org.example.bmsdec24.dtos.SeatResponseDto;
import org.example.bmsdec24.dtos.TheatreDetailResponseDto;
import org.example.bmsdec24.dtos.TheatreResponseDto;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.ResourceNotFoundException;
import org.example.bmsdec24.models.Genre;
import org.example.bmsdec24.models.MovieStatus;
import org.example.bmsdec24.models.Theatre;
import org.example.bmsdec24.repos.CityRepository;
import org.example.bmsdec24.repos.MovieRepository;
import org.example.bmsdec24.repos.SeatRepository;
import org.example.bmsdec24.repos.TheatreRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CatalogServiceImpl implements CatalogService {

    private final CityRepository cityRepository;
    private final TheatreRepository theatreRepository;
    private final MovieRepository movieRepository;
    private final SeatRepository seatRepository;

    public CatalogServiceImpl(CityRepository cityRepository,
                              TheatreRepository theatreRepository,
                              MovieRepository movieRepository,
                              SeatRepository seatRepository) {
        this.cityRepository = cityRepository;
        this.theatreRepository = theatreRepository;
        this.movieRepository = movieRepository;
        this.seatRepository = seatRepository;
    }

    @Override
    public List<CityResponseDto> listCities() {
        return cityRepository.findAll().stream()
                .map(CityResponseDto::from)
                .toList();
    }

    @Override
    public List<TheatreResponseDto> listTheatresByCity(int cityId) throws ResourceNotFoundException {
        requireCity(cityId);
        return theatreRepository.findAllByCity_Id(cityId).stream()
                .map(TheatreResponseDto::from)
                .toList();
    }

    @Override
    public TheatreDetailResponseDto getTheatre(int theatreId) throws ResourceNotFoundException {
        Theatre theatre = theatreRepository.findWithMoviesById(theatreId)
                .orElseThrow(() -> new ResourceNotFoundException("No theatre found with id: " + theatreId));
        return TheatreDetailResponseDto.from(theatre);
    }

    @Override
    public List<MovieResponseDto> listMovies(Genre genre) {
        if (genre == null) {
            return movieRepository.findAll().stream()
                    .map(MovieResponseDto::from)
                    .toList();
        }
        return movieRepository.findAllByGenre(genre).stream()
                .map(MovieResponseDto::from)
                .toList();
    }

    @Override
    public MovieResponseDto getMovie(int movieId) throws ResourceNotFoundException {
        return MovieResponseDto.from(requireMovie(movieId));
    }

    @Override
    public List<MovieResponseDto> searchMovies(String query) throws InvalidRequestException {
        if (query == null || query.isBlank()) {
            throw new InvalidRequestException("Search query q must not be blank");
        }
        return movieRepository.search(query.trim()).stream()
                .map(MovieResponseDto::from)
                .toList();
    }

    @Override
    public List<MovieResponseDto> listNowShowing(Integer cityId) throws ResourceNotFoundException {
        if (cityId == null) {
            return movieRepository.findAllByStatus(MovieStatus.NOW_SHOWING).stream()
                    .map(MovieResponseDto::from)
                    .toList();
        }
        requireCity(cityId);
        return movieRepository.findDistinctByStatusAndTheatreMovies_Theatre_City_Id(MovieStatus.NOW_SHOWING, cityId)
                .stream()
                .map(MovieResponseDto::from)
                .toList();
    }

    @Override
    public List<MovieResponseDto> listComingSoon() {
        return movieRepository.findAllByStatus(MovieStatus.COMING_SOON).stream()
                .map(MovieResponseDto::from)
                .toList();
    }

    @Override
    public List<SeatResponseDto> listSeatsByTheatre(int theatreId) throws ResourceNotFoundException {
        requireTheatre(theatreId);
        return seatRepository.findAllByTheatre_Id(theatreId).stream()
                .map(SeatResponseDto::from)
                .toList();
    }

    private void requireCity(int cityId) throws ResourceNotFoundException {
        if (!cityRepository.existsById(cityId)) {
            throw new ResourceNotFoundException("No city found with id: " + cityId);
        }
    }

    private void requireTheatre(int theatreId) throws ResourceNotFoundException {
        if (!theatreRepository.existsById(theatreId)) {
            throw new ResourceNotFoundException("No theatre found with id: " + theatreId);
        }
    }

    private org.example.bmsdec24.models.Movie requireMovie(int movieId) throws ResourceNotFoundException {
        var movie = movieRepository.findById(movieId);
        if (movie.isEmpty()) {
            throw new ResourceNotFoundException("No movie found with id: " + movieId);
        }
        return movie.get();
    }
}
