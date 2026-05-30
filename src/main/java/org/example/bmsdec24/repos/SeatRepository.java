package org.example.bmsdec24.repos;

import jakarta.persistence.LockModeType;
import org.example.bmsdec24.models.Seat;
import org.example.bmsdec24.models.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Integer> {

    List<Seat> findAllByTheatre_Id(int theatreId);

    List<Seat> findAllByTheatre_IdAndSeatStatus(int theatreId, SeatStatus seatStatus);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Seat> findAllByIdIn(List<Integer> ids);
}
