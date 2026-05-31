package org.example.bmsdec24.models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Entity(name = "theatres")
public class Theatre extends BaseModel {

    private String name;

    private String address;

    @ManyToOne
    @JoinColumn(name = "city_id")
    private City city;

    @OneToMany(mappedBy = "theatre")
    private List<Seat> seats;

    @OneToMany(mappedBy = "theatre", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TheatreMovie> theatreMovies;

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

    public City getCity() {
        return city;
    }

    public void setCity(City city) {
        this.city = city;
    }

    public List<Seat> getSeats() {
        return seats;
    }

    public void setSeats(List<Seat> seats) {
        this.seats = seats;
    }

    public List<TheatreMovie> getTheatreMovies() {
        return theatreMovies;
    }

    public void setTheatreMovies(List<TheatreMovie> theatreMovies) {
        this.theatreMovies = theatreMovies;
    }

    public List<Movie> getMovies() {
        if (theatreMovies == null) {
            return Collections.emptyList();
        }
        return theatreMovies.stream()
                .map(TheatreMovie::getMovie)
                .collect(Collectors.toList());
    }
}
