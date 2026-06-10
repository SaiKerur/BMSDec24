package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Ticket;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Integer> {

    @EntityGraph(attributePaths = {
            "booking", "booking.seats", "booking.user", "booking.movie", "booking.theatre", "booking.show"
    })
    Optional<Ticket> findDetailedByBooking_Id(int bookingId);

    @EntityGraph(attributePaths = {
            "booking", "booking.seats", "booking.user", "booking.movie", "booking.theatre", "booking.show"
    })
    Optional<Ticket> findDetailedByBookingReference(String bookingReference);

    @EntityGraph(attributePaths = {
            "booking", "booking.seats", "booking.user", "booking.movie", "booking.theatre", "booking.show"
    })
    Optional<Ticket> findDetailedByQrPayload(String qrPayload);

    boolean existsByBookingReference(String bookingReference);
}
