package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Movie;
import org.example.bmsdec24.models.Theatre;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class TheatreDetailResponseDto {
    private int id;
    private String name;
    private String address;
    private CityResponseDto city;
    private List<MovieResponseDto> movies;

    public static TheatreDetailResponseDto from(Theatre theatre) {
        if (theatre == null) {
            return null;
        }
        TheatreDetailResponseDto dto = new TheatreDetailResponseDto();
        dto.setId(theatre.getId());
        dto.setName(theatre.getName());
        dto.setAddress(theatre.getAddress());
        dto.setCity(CityResponseDto.from(theatre.getCity()));
        List<Movie> movies = theatre.getMovies();
        if (movies == null || movies.isEmpty()) {
            dto.setMovies(Collections.emptyList());
        } else {
            dto.setMovies(movies.stream().map(MovieResponseDto::from).collect(Collectors.toList()));
        }
        return dto;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public CityResponseDto getCity() {
        return city;
    }

    public void setCity(CityResponseDto city) {
        this.city = city;
    }

    public List<MovieResponseDto> getMovies() {
        return movies;
    }

    public void setMovies(List<MovieResponseDto> movies) {
        this.movies = movies;
    }
}
