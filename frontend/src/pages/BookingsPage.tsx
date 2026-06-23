import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiWithAuthRetry } from '../lib/api';
import { formatMoney, formatDateTime } from '../lib/i18n';
import type { Booking } from '../types';

export function BookingsPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    void apiWithAuthRetry<Booking[]>('/users/me/bookings').then(setBookings);
  }, []);

  return (
    <div>
      <h1 className="section-title">{t('bookings.title')}</h1>
      {!bookings.length ? (
        <div className="empty">{t('bookings.empty')}</div>
      ) : (
        bookings.map((b) => (
          <div key={b.id} className="panel booking-card">
            <div className="kv"><span className="k">{b.movieName}</span><span className={`pill ${b.status}`}>{b.status}</span></div>
            <div className="kv"><span className="k">Total</span><span>{formatMoney(b.totalAmount)}</span></div>
            {b.status === 'CONFIRMED' && (
              <Link to={`/ticket/${b.id}`} className="btn btn-primary">View ticket</Link>
            )}
            {b.status === 'PENDING' && (
              <Link to={`/checkout/${b.id}`} className="btn btn-primary">Complete payment</Link>
            )}
          </div>
        ))
      )}
    </div>
  );
}
