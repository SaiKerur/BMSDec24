package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.models.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Integer> {

    @EntityGraph(attributePaths = {"showSeats", "showSeats.seat", "show", "movie", "user"})
    Optional<Ticket> findDetailedById(int ticketId);

    @EntityGraph(attributePaths = {"showSeats"})
    List<Ticket> findAllByStatusAndHoldExpiresAtBefore(TicketStatus status, Date holdExpiresAt);
}
