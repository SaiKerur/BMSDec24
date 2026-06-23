import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiWithAuthRetry, fetchMe } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Booking, UserProfile } from '../types';
import { Button } from '../components/ui/Button';

export function ProfilePage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  useEffect(() => {
    void (async () => {
      setProfile(await fetchMe());
      setBookings(await apiWithAuthRetry<Booking[]>('/users/me/bookings'));
    })();
  }, []);

  const filtered = bookings.filter((b) => {
    if (filter === 'cancelled') return b.status === 'CANCELLED';
    if (filter === 'past') return b.status === 'CONFIRMED';
    return b.status === 'PENDING' || b.status === 'CONFIRMED';
  });

  return (
    <div>
      <h1 className="section-title">{t('profile.title')}</h1>
      {profile && (
        <div className="panel">
          <div className="kv"><span className="k">Email</span><span>{profile.email}</span></div>
          <div className="kv"><span className="k">Role</span><span>{profile.role}</span></div>
        </div>
      )}
      <div className="filters">
        {(['upcoming', 'past', 'cancelled'] as const).map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {t(`profile.${f}`)}
          </button>
        ))}
      </div>
      {filtered.map((b) => (
        <div key={b.id} className="panel">{b.movieName} — {b.status}</div>
      ))}
      <Button variant="ghost" onClick={logout}>{t('profile.logoutEverywhere')}</Button>
    </div>
  );
}
