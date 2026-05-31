package org.example.bmsdec24.models;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;

@Entity(name = "theatre_movies")
public class TheatreMovie {

    @EmbeddedId
    private TheatreMovieId id = new TheatreMovieId();

    @MapsId("theatreId")
    @ManyToOne
    @JoinColumn(name = "theatre_id")
    private Theatre theatre;

    @MapsId("movieId")
    @ManyToOne
    @JoinColumn(name = "movie_id")
    private Movie movie;

    @Column(name = "theatre_name")
    private String theatreName;

    @Column(name = "movie_name")
    private String movieName;

    public TheatreMovieId getId() {
        return id;
    }

    public void setId(TheatreMovieId id) {
        this.id = id;
    }

    public Theatre getTheatre() {
        return theatre;
    }

    public void setTheatre(Theatre theatre) {
        this.theatre = theatre;
        if (theatre != null) {
            this.theatreName = theatre.getName();
            if (id != null) {
                id.setTheatreId(theatre.getId());
            }
        }
    }

    public Movie getMovie() {
        return movie;
    }

    public void setMovie(Movie movie) {
        this.movie = movie;
        if (movie != null) {
            this.movieName = movie.getTitle();
            if (id != null) {
                id.setMovieId(movie.getId());
            }
        }
    }

    public String getTheatreName() {
        return theatreName;
    }

    public void setTheatreName(String theatreName) {
        this.theatreName = theatreName;
    }

    public String getMovieName() {
        return movieName;
    }

    public void setMovieName(String movieName) {
        this.movieName = movieName;
    }

    public void syncDenormalizedNames() {
        if (theatre != null) {
            this.theatreName = theatre.getName();
        }
        if (movie != null) {
            this.movieName = movie.getTitle();
        }
    }
}
