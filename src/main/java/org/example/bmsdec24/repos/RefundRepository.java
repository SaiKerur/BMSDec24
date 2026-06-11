package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Refund;
import org.example.bmsdec24.models.RefundStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Integer> {

    @EntityGraph(attributePaths = {
            "booking", "booking.user", "booking.show", "payment", "cancellationPolicy"
    })
    Optional<Refund> findDetailedById(int refundId);

    @EntityGraph(attributePaths = {"booking", "payment", "cancellationPolicy"})
    Optional<Refund> findFirstByBooking_IdAndStatus(int bookingId, RefundStatus status);

    boolean existsByBooking_IdAndStatus(int bookingId, RefundStatus status);
}
