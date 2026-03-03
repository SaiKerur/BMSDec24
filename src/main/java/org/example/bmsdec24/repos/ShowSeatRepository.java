package org.example.bmsdec24.repos;

import jakarta.persistence.LockModeType;
import org.example.bmsdec24.models.ShowSeat;
import org.example.bmsdec24.models.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShowSeatRepository extends JpaRepository<ShowSeat, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<ShowSeat> findAllByIdInAndSeatStatus(List<Integer> ids, SeatStatus seatStatus);
}
