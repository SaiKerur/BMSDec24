package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.SeatType;
import org.example.bmsdec24.models.SeatTypeShow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SeatTypeShowRepository extends JpaRepository<SeatTypeShow, Integer> {

    Optional<SeatTypeShow> findByShow_IdAndSeatType(int showId, SeatType seatType);
}
