import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiWithAuthRetry } from '../lib/api';
import { formatMoney } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { useSeatStream } from '../hooks/useSeatStream';
import { getCachedShow, type ShowAvailability, type ShowSeat } from '../types';
import { Button } from '../components/ui/Button';

export function ShowPage() {
  const { id } = useParams();
  const showId = Number(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requireLogin } = useAuth();
  const { notify } = useNotify();
  const [avail, setAvail] = useState<ShowAvailability | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const meta = getCachedShow(showId);

  const onUpdate = useCallback(
    (next: ShowAvailability) => {
      setAvail((prev) => {
        if (!prev) return next;
        // Deselect seats that became unavailable
        setSelected((sel) =>
          sel.filter((sid) => {
            const seat = next.seats.find((s) => s.showSeatId === sid);
            return seat?.seatStatus === 'AVAILABLE' || sel.includes(sid);
          }),
        );
        const taken = selected.filter((sid) => {
          const was = prev.seats.find((s) => s.showSeatId === sid);
          const now = next.seats.find((s) => s.showSeatId === sid);
          return was?.seatStatus === 'AVAILABLE' && now && now.seatStatus !== 'AVAILABLE';
        });
        if (taken.length) notify(t('show.seatTaken'), 'error');
        return next;
      });
    },
    [notify, selected, t],
  );

  const { connected } = useSeatStream(showId, onUpdate);

  useEffect(() => {
    if (!showId) return;
    void api<ShowAvailability>(`/shows/${showId}/availability`).then(setAvail);
  }, [showId]);

  const rows = useMemo(() => {
    if (!avail) return [];
    const seats = [...avail.seats].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));
    const map = new Map<string, ShowSeat[]>();
    seats.forEach((s) => {
      const row = (s.seatNumber.match(/^[A-Za-z]+/) || ['?'])[0];
      if (!map.has(row)) map.set(row, []);
      map.get(row)!.push(s);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [avail]);

  const total = selected.reduce((sum, sid) => {
    const s = avail?.seats.find((x) => x.showSeatId === sid);
    return sum + (s?.price || 0);
  }, 0);

  const toggle = (seat: ShowSeat) => {
    if (seat.seatStatus !== 'AVAILABLE') return;
    setSelected((sel) =>
      sel.includes(seat.showSeatId)
        ? sel.filter((x) => x !== seat.showSeatId)
        : [...sel, seat.showSeatId],
    );
  };

  const proceed = async () => {
    if (!selected.length) return;
    const ok = await requireLogin();
    if (!ok) return;
    setBusy(true);
    try {
      const booking = await apiWithAuthRetry<{ id: number }>('/bookings/book-show-seats', {
        method: 'POST',
        body: { showSeatIds: selected },
      });
      notify(t('show.held'), 'success');
      navigate(`/checkout/${booking.id}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!avail) return <div className="spinner" aria-label="Loading" />;

  return (
    <div>
      <h1 className="section-title">{meta?.movieTitle || t('show.title')}</h1>
      <p className="section-sub">
        {[meta?.theatreName, meta?.screenName].filter(Boolean).join(' · ')}
        {connected && <span className="live-badge"> ● {t('show.live')}</span>}
      </p>
      <p className="section-sub">{t('show.available', { count: avail.availableSeats, total: avail.totalSeats })}</p>
      <div className="screen-banner">{t('show.screen')}</div>
      <div className="seat-map-scroll">
        <div className="seat-map" role="group" aria-label="Seat map">
          {rows.map(([row, seats]) => (
            <div key={row} className="seat-row">
              <span className="row-label" aria-hidden="true">{row}</span>
              {seats.map((s) => {
                const taken = s.seatStatus === 'BOOKED' || s.seatStatus === 'BLOCKED';
                const isSel = selected.includes(s.showSeatId);
                return (
                  <button
                    key={s.showSeatId}
                    type="button"
                    className={`seat ${taken ? s.seatStatus.toLowerCase() : ''} ${isSel ? 'selected' : ''}`}
                    disabled={taken}
                    aria-pressed={isSel}
                    aria-label={`Seat ${s.seatNumber}`}
                    onClick={() => toggle(s)}
                  >
                    {s.seatNumber}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="legend">
        <span><i className="swatch avail" /> Available</span>
        <span><i className="swatch sel" /> Selected</span>
        <span><i className="swatch booked" /> Booked</span>
        <span><i className="swatch blocked" /> Blocked</span>
      </div>
      <div className="summary-bar">
        <div>
          <div className="label">{selected.length} seat(s) selected</div>
          <div className="total">{formatMoney(total)}</div>
        </div>
        <Button variant="primary" disabled={!selected.length || busy} onClick={proceed}>
          {busy ? t('show.booking') : t('show.proceed')}
        </Button>
      </div>
    </div>
  );
}
