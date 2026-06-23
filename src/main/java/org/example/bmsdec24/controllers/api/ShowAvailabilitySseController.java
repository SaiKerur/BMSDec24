package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.ResourceNotFoundException;
import org.example.bmsdec24.services.ShowAvailabilityBroadcaster;
import org.example.bmsdec24.services.ShowService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/shows")
public class ShowAvailabilitySseController {

    private final ShowAvailabilityBroadcaster broadcaster;
    private final ShowService showService;

    public ShowAvailabilitySseController(ShowAvailabilityBroadcaster broadcaster, ShowService showService) {
        this.broadcaster = broadcaster;
        this.showService = showService;
    }

    /**
     * Server-Sent Events stream for live seat map updates.
     * Sends an initial snapshot, then pushes updates when seats change.
     */
    @GetMapping(value = "/{showId}/availability/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAvailability(@PathVariable int showId)
            throws ResourceNotFoundException, InvalidRequestException {
        if (showId <= 0) {
            throw new InvalidRequestException("showId must be a positive integer");
        }
        SseEmitter emitter = broadcaster.subscribe(showId);
        try {
            emitter.send(SseEmitter.event()
                    .name("availability")
                    .data(showService.getShowAvailability(showId, null)));
        } catch (Exception ex) {
            emitter.completeWithError(ex);
        }
        return emitter;
    }
}
