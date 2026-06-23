import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiWithAuthRetry } from '../lib/api';
import { formatDateTime } from '../lib/i18n';
import type { Booking, Ticket } from '../types';
import { Button } from '../components/ui/Button';

export function TicketPage() {
  const { bookingId } = useParams();
  const { t } = useTranslation();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    void (async () => {
      let tk: Ticket;
      try {
        tk = await apiWithAuthRetry<Ticket>(`/bookings/${bookingId}/ticket`);
      } catch {
        tk = await apiWithAuthRetry<Ticket>(`/bookings/${bookingId}/issue-ticket`, { method: 'POST' });
      }
      setTicket(tk);
      setBooking(await apiWithAuthRetry<Booking>(`/bookings/${bookingId}`).catch(() => null));
      // Cache for offline PWA access
      try {
        localStorage.setItem(`bms_ticket_${bookingId}`, JSON.stringify({ ticket: tk, booking, cachedAt: Date.now() }));
      } catch { /* ignore */ }
    })();
  }, [bookingId]);

  if (!ticket) return <div className="spinner" aria-label="Loading" />;

  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticket.qrPayload || ticket.bookingReference || bookingId!)}`;
  const seats = booking?.seats?.map((s) => s.seatNumber).join(', ');

  const share = async () => {
    const text = `Ticket ${ticket.bookingReference} — ${ticket.movieName}`;
    if (navigator.share) await navigator.share({ title: 'BookMyShow Ticket', text, url: window.location.href });
    else await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
  };

  return (
    <div>
      <div className="ticket" id="ticketCard">
        <h2>{ticket.movieName || t('ticket.title')}</h2>
        <div className="section-sub">{ticket.theatreName}</div>
        <div className="qr"><img src={qr} alt="QR code" crossOrigin="anonymous" /></div>
        <div className="ref">{ticket.bookingReference || `BMS-${bookingId}`}</div>
        {booking?.show?.startTime && (
          <div className="kv"><span className="k">Showtime</span><span>{formatDateTime(booking.show.startTime)}</span></div>
        )}
        <div className="kv"><span className="k">Seats</span><span>{seats || ticket.seatCount}</span></div>
      </div>
      <div className="ticket-actions">
        <Button onClick={() => window.print()}>{t('ticket.print')}</Button>
        <Button onClick={share}>{t('ticket.share')}</Button>
        <Link to="/bookings" className="btn btn-ghost">{t('nav.bookings')}</Link>
      </div>
    </div>
  );
}
