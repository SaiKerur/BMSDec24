package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Genre;
import org.example.bmsdec24.models.Movie;

public class MovieResponseDto {
    private int id;
    private String title;
    private Genre genre;

    public static MovieResponseDto from(Movie movie) {
        if (movie == null) {
            return null;
        }
        MovieResponseDto dto = new MovieResponseDto();
        dto.setId(movie.getId());
        dto.setTitle(movie.getTitle());
        dto.setGenre(movie.getGenre());
        return dto;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Genre getGenre() {
        return genre;
    }

    public void setGenre(Genre genre) {
        this.genre = genre;
    }
}
