package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.BookingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingEventRepository extends JpaRepository<BookingEvent, Integer> {

    List<BookingEvent> findAllByBooking_IdOrderByCreatedAtAsc(int bookingId);
}
