package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.CityResponseDto;
import org.example.bmsdec24.dtos.MovieResponseDto;
import org.example.bmsdec24.dtos.SeatResponseDto;
import org.example.bmsdec24.dtos.TheatreDetailResponseDto;
import org.example.bmsdec24.dtos.TheatreResponseDto;
import org.example.bmsdec24.exceptions.ResourceNotFoundException;
import org.example.bmsdec24.models.Genre;

import java.util.List;

public interface CatalogService {

    List<CityResponseDto> listCities();

    List<TheatreResponseDto> listTheatresByCity(int cityId) throws ResourceNotFoundException;

    TheatreDetailResponseDto getTheatre(int theatreId) throws ResourceNotFoundException;

    List<MovieResponseDto> listMovies(Genre genre);

    List<SeatResponseDto> listSeatsByTheatre(int theatreId) throws ResourceNotFoundException;
}
