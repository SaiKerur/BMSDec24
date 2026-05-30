package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Payment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    @EntityGraph(attributePaths = {"ticket", "ticket.showSeats", "ticket.showSeats.seat", "ticket.user", "ticket.show"})
    Optional<Payment> findDetailedById(int paymentId);
}
