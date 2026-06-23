package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.ShowAvailabilityResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pushes live seat-availability snapshots to SSE subscribers per show.
 */
@Service
public class ShowAvailabilityBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(ShowAvailabilityBroadcaster.class);

    private final ConcurrentHashMap<Integer, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    public SseEmitter subscribe(int showId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(showId, id -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(showId, emitter));
        emitter.onTimeout(() -> remove(showId, emitter));
        emitter.onError(ex -> remove(showId, emitter));
        return emitter;
    }

    public void broadcast(int showId, ShowAvailabilityResponseDto availability) {
        List<SseEmitter> subscribers = emitters.get(showId);
        if (subscribers == null || subscribers.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : subscribers) {
            try {
                emitter.send(SseEmitter.event()
                        .name("availability")
                        .data(availability));
            } catch (IOException ex) {
                log.debug("SSE send failed for show {} — removing subscriber", showId);
                remove(showId, emitter);
            }
        }
    }

    private void remove(int showId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(showId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emitters.remove(showId, list);
            }
        }
        emitter.complete();
    }
}
