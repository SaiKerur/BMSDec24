package org.example.bmsdec24.config;

import org.example.bmsdec24.models.City;
import org.example.bmsdec24.models.Genre;
import org.example.bmsdec24.models.Movie;
import org.example.bmsdec24.models.Seat;
import org.example.bmsdec24.models.SeatStatus;
import org.example.bmsdec24.models.SeatType;
import org.example.bmsdec24.models.Theatre;
import org.example.bmsdec24.models.TheatreMovie;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.repos.CityRepository;
import org.example.bmsdec24.repos.MovieRepository;
import org.example.bmsdec24.repos.SeatRepository;
import org.example.bmsdec24.repos.TheatreRepository;
import org.example.bmsdec24.repos.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;

@Configuration
@Profile("h2")
public class H2DataSeeder {

    @Bean
    CommandLineRunner seedDemoData(CityRepository cityRepository,
                                   MovieRepository movieRepository,
                                   TheatreRepository theatreRepository,
                                   SeatRepository seatRepository,
                                   UserRepository userRepository,
                                   PasswordEncoder passwordEncoder) {
        return args -> {
            if (cityRepository.count() > 0) {
                return;
            }

            City bengaluru = cityRepository.save(city("Bengaluru"));
            City mumbai = cityRepository.save(city("Mumbai"));

            Movie actionBlast = movieRepository.save(movie("Action Blast", Genre.ACTION));
            Movie romCom = movieRepository.save(movie("RomCom Nights", Genre.ROM_COM));
            Movie comedy = movieRepository.save(movie("Laugh Out Loud", Genre.COMEDY));

            Theatre orion = theatreRepository.save(theatre("Orion PVR", "Dr Rajkumar Road, Bengaluru", bengaluru));
            Theatre phoenix = theatreRepository.save(theatre("PVR Phoenix", "Lower Parel, Mumbai", mumbai));

            linkMovie(orion, actionBlast);
            linkMovie(orion, romCom);
            linkMovie(phoenix, actionBlast);
            linkMovie(phoenix, comedy);
            theatreRepository.save(orion);
            theatreRepository.save(phoenix);

            seatRepository.save(seat("A1", SeatType.GOLD, 250.0, SeatStatus.AVAILABLE, orion));
            seatRepository.save(seat("A2", SeatType.GOLD, 250.0, SeatStatus.AVAILABLE, orion));
            seatRepository.save(seat("B1", SeatType.SILVER, 180.0, SeatStatus.BOOKED, orion));
            seatRepository.save(seat("B2", SeatType.SILVER, 180.0, SeatStatus.BOOKED, orion));
            seatRepository.save(seat("C1", SeatType.PLATINUM, 330.0, SeatStatus.BLOCKED, orion));

            seatRepository.save(seat("A1", SeatType.GOLD, 300.0, SeatStatus.AVAILABLE, phoenix));
            seatRepository.save(seat("A2", SeatType.GOLD, 300.0, SeatStatus.AVAILABLE, phoenix));
            seatRepository.save(seat("B1", SeatType.SILVER, 220.0, SeatStatus.AVAILABLE, phoenix));
            seatRepository.save(seat("C1", SeatType.PLATINUM, 380.0, SeatStatus.AVAILABLE, phoenix));

            User john = user("John Seed", "john.seed@example.com", passwordEncoder.encode("Password@123"));
            User amy = user("Amy Seed", "amy.seed@example.com", passwordEncoder.encode("Password@123"));
            userRepository.save(john);
            userRepository.save(amy);
        };
    }

    private static City city(String name) {
        City city = new City();
        city.setName(name);
        return city;
    }

    private static Movie movie(String title, Genre genre) {
        Movie movie = new Movie();
        movie.setTitle(title);
        movie.setGenre(genre);
        return movie;
    }

    private static Theatre theatre(String name, String address, City city) {
        Theatre theatre = new Theatre();
        theatre.setName(name);
        theatre.setAddress(address);
        theatre.setCity(city);
        return theatre;
    }

    private static void linkMovie(Theatre theatre, Movie movie) {
        if (theatre.getTheatreMovies() == null) {
            theatre.setTheatreMovies(new ArrayList<>());
        }
        TheatreMovie link = new TheatreMovie();
        link.setTheatre(theatre);
        link.setMovie(movie);
        link.syncDenormalizedNames();
        theatre.getTheatreMovies().add(link);
    }

    private static Seat seat(String number, SeatType type, double price, SeatStatus status, Theatre theatre) {
        Seat seat = new Seat();
        seat.setSeatNumber(number);
        seat.setSeatType(type);
        seat.setPrice(price);
        seat.setSeatStatus(status);
        seat.setTheatre(theatre);
        seat.syncDenormalizedNames();
        return seat;
    }

    private static User user(String name, String email, String encodedPassword) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(encodedPassword);
        return user;
    }
}
