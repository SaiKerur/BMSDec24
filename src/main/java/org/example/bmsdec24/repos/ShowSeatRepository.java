package org.example.bmsdec24.repos;

import jakarta.persistence.LockModeType;
import org.example.bmsdec24.models.ShowSeat;
import org.example.bmsdec24.models.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface ShowSeatRepository extends JpaRepository<ShowSeat, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<ShowSeat> findAllByIdIn(List<Integer> ids);

    @EntityGraph(attributePaths = {"seat"})
    List<ShowSeat> findAllByShow_IdOrderByIdAsc(int showId);

    @EntityGraph(attributePaths = {"seat"})
    List<ShowSeat> findAllByShow_IdAndUpdatedAtAfterOrderByUpdatedAtAsc(int showId, Date updatedAt);

    long countByShow_IdAndSeatStatus(int showId, SeatStatus seatStatus);
}
