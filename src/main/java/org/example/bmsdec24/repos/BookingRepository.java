package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Integer> {

    @EntityGraph(attributePaths = {"seats", "seats.theatre", "movie", "theatre", "theatre.city", "user", "show", "show.screen"})
    Optional<Booking> findDetailedById(int bookingId);

    @EntityGraph(attributePaths = {"seats"})
    List<Booking> findAllByStatusAndHoldExpiresAtBefore(BookingStatus status, Date holdExpiresAt);

    @EntityGraph(attributePaths = {"seats", "seats.theatre", "movie", "theatre", "theatre.city", "user", "show", "show.screen"})
    List<Booking> findAllByUser_IdOrderByCreatedAtDesc(int userId);

    @EntityGraph(attributePaths = {"seats", "seats.theatre", "movie", "theatre", "theatre.city", "user", "show", "show.screen"})
    List<Booking> findAllByUser_IdAndStatusOrderByCreatedAtDesc(int userId, BookingStatus status);
}
