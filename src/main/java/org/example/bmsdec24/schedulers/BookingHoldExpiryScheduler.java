package org.example.bmsdec24.schedulers;

import org.example.bmsdec24.services.BookingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BookingHoldExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(BookingHoldExpiryScheduler.class);

    private final BookingService bookingService;

    @Value("${bms.booking.hold-expiry-scheduler-enabled:true}")
    private boolean schedulerEnabled;

    public BookingHoldExpiryScheduler(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @Scheduled(fixedDelayString = "${bms.booking.hold-expiry-interval-ms:120000}")
    public void releaseExpiredHolds() {
        if (!schedulerEnabled) {
            return;
        }
        int released = bookingService.releaseExpiredPendingBookings();
        if (released > 0) {
            log.info("Released {} expired pending booking hold(s)", released);
        }
    }
}
