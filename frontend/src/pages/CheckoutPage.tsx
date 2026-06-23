import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiWithAuthRetry } from '../lib/api';
import { formatMoney } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import type { Booking, PaymentInit } from '../types';
import { mmss } from '../types';
import { StripeCheckout } from '../components/payment/StripeCheckout';
import { RazorpayCheckout } from '../components/payment/PaymentForms';
import { Button } from '../components/ui/Button';

type Provider = { provider: string; displayName: string; configured: boolean };

export function CheckoutPage() {
  const { bookingId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requireLogin, loggedIn } = useAuth();
  const { notify } = useNotify();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentInit | null>(null);
  const [holdLeft, setHoldLeft] = useState('--:--');

  useEffect(() => {
    if (!loggedIn) void requireLogin();
  }, [loggedIn, requireLogin]);

  useEffect(() => {
    if (!bookingId) return;
    void (async () => {
      const [b, p] = await Promise.all([
        apiWithAuthRetry<Booking>(`/bookings/${bookingId}`),
        api<Provider[]>('/payments/providers', { auth: true }).catch(() => []),
      ]);
      setBooking(b);
      setProviders(p.length ? p : [
        { provider: 'STRIPE', displayName: 'Stripe', configured: true },
        { provider: 'RAZORPAY', displayName: 'Razorpay', configured: true },
      ]);
    })();
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.holdExpiresAt) return;
    const expires = new Date(booking.holdExpiresAt).getTime();
    const tick = () => {
      const rem = expires - Date.now();
      setHoldLeft(mmss(rem));
      if (rem <= 0) navigate('/home');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking, navigate]);

  const initiate = async () => {
    if (!selected || !bookingId) return;
    const p = await apiWithAuthRetry<PaymentInit>('/payments/initiate', {
      method: 'POST',
      body: { bookingId: Number(bookingId), provider: selected },
    });
    setPayment(p);
  };

  const onPaid = () => {
    notify(t('checkout.success'), 'success');
    navigate(`/ticket/${bookingId}`);
  };

  if (!booking) return <div className="spinner" aria-label="Loading" />;

  if (booking.status === 'CONFIRMED') {
    return (
      <div className="panel" style={{ textAlign: 'center' }}>
        <h1 className="section-title">{t('checkout.confirmed')}</h1>
        <p className="section-sub">{t('checkout.confirmedBody')}</p>
        <Link to={`/ticket/${booking.id}`} className="btn btn-primary">View ticket</Link>
      </div>
    );
  }

  const seatLabels = (booking.seats || []).map((s) => s.seatNumber).join(', ');

  return (
    <div>
      <h1 className="section-title">{t('checkout.title')}</h1>
      {booking.holdExpiresAt && (
        <div className="hold-banner" role="status">
          <span className="hold-dot" aria-hidden="true" />
          {t('checkout.hold', { time: holdLeft })}
        </div>
      )}
      <div className="panel">
        <div className="kv"><span className="k">Movie</span><span>{booking.movieName || '—'}</span></div>
        <div className="kv"><span className="k">Theatre</span><span>{booking.theatreName || '—'}</span></div>
        <div className="kv"><span className="k">Seats</span><span>{seatLabels || '—'}</span></div>
        <div className="kv"><span className="k">Total</span><span><b>{formatMoney(booking.totalAmount)}</b></span></div>
      </div>

      {!payment ? (
        <div className="panel">
          <h3>{t('checkout.selectProvider')}</h3>
          <div className="provider-list">
            {providers.map((p) => (
              <button
                key={p.provider}
                type="button"
                className={`provider-card ${selected === p.provider ? 'selected' : ''}`}
                onClick={() => setSelected(p.provider)}
              >
                <div className="name">{p.displayName}</div>
                <div className="status">{p.configured ? 'Available' : 'Not configured'}</div>
              </button>
            ))}
          </div>
          <Button variant="primary" block disabled={!selected} onClick={() => void initiate()}>
            {t('checkout.pay', { amount: formatMoney(booking.totalAmount) })}
          </Button>
        </div>
      ) : payment.provider === 'STRIPE' ? (
        <StripeCheckout payment={payment} onSuccess={onPaid} onError={(m) => notify(m, 'error')} />
      ) : (
        <RazorpayCheckout payment={payment} onSuccess={onPaid} onError={(m) => notify(m, 'error')} />
      )}
    </div>
  );
}
