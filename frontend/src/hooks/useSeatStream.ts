import { useEffect, useRef, useState } from 'react';
import type { ShowAvailability } from '../types';

export function useSeatStream(showId: number, onUpdate: (avail: ShowAvailability) => void) {
  const [connected, setConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!showId) return;
    const es = new EventSource(`/api/shows/${showId}/availability/stream`);

    const handle = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as ShowAvailability;
        onUpdateRef.current(data);
      } catch {
        /* ignore malformed events */
      }
    };

    es.addEventListener('availability', handle);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => {
      es.removeEventListener('availability', handle);
      es.close();
      setConnected(false);
    };
  }, [showId]);

  return { connected };
}
