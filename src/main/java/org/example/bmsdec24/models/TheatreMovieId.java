package org.example.bmsdec24.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class TheatreMovieId implements Serializable {

    @Column(name = "theatre_id")
    private int theatreId;

    @Column(name = "movie_id")
    private int movieId;

    public TheatreMovieId() {
    }

    public TheatreMovieId(int theatreId, int movieId) {
        this.theatreId = theatreId;
        this.movieId = movieId;
    }

    public int getTheatreId() {
        return theatreId;
    }

    public void setTheatreId(int theatreId) {
        this.theatreId = theatreId;
    }

    public int getMovieId() {
        return movieId;
    }

    public void setMovieId(int movieId) {
        this.movieId = movieId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        TheatreMovieId that = (TheatreMovieId) o;
        return theatreId == that.theatreId && movieId == that.movieId;
    }

    @Override
    public int hashCode() {
        return Objects.hash(theatreId, movieId);
    }
}
