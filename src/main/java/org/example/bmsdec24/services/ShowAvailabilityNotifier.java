package org.example.bmsdec24.services;

import org.example.bmsdec24.models.Show;
import org.springframework.stereotype.Component;

/**
 * Notifies SSE subscribers after seat status changes for a show.
 */
@Component
public class ShowAvailabilityNotifier {

    private final ShowAvailabilityBroadcaster broadcaster;
    private final ShowService showService;

    public ShowAvailabilityNotifier(ShowAvailabilityBroadcaster broadcaster, ShowService showService) {
        this.broadcaster = broadcaster;
        this.showService = showService;
    }

    public void notifyShowChanged(Show show) {
        if (show == null) {
            return;
        }
        notifyShowId(show.getId());
    }

    public void notifyShowId(int showId) {
        if (showId <= 0) {
            return;
        }
        try {
            broadcaster.broadcast(showId, showService.getShowAvailability(showId, null));
        } catch (Exception ignored) {
            // Best-effort broadcast.
        }
    }
}
