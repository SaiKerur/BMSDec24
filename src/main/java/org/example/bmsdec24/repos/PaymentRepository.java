package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Payment;
import org.example.bmsdec24.models.PaymentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    @EntityGraph(attributePaths = {"booking", "booking.seats", "booking.user", "booking.theatre", "booking.movie"})
    Optional<Payment> findDetailedById(int paymentId);

    Optional<Payment> findFirstByBooking_IdAndStatus(int bookingId, PaymentStatus status);

    @EntityGraph(attributePaths = {"booking", "booking.seats", "booking.user", "booking.theatre", "booking.movie"})
    Optional<Payment> findDetailedByGatewayOrderId(String gatewayOrderId);
}
