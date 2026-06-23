import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/i18n';
import { cacheShow, dayKey, type Show } from '../types';

export function MoviePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [movie, setMovie] = useState<{ title: string; runtime?: number; synopsis?: string } | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      const [m, s] = await Promise.all([
        api<{ title: string; runtime?: number; synopsis?: string }>(`/catalog/movies/${id}`),
        api<Show[]>(`/shows/movies/${id}`),
      ]);
      setMovie(m);
      setShows(s);
      s.forEach(cacheShow);
      setLoading(false);
    })();
  }, [id]);

  const days = useMemo(() => {
    const keys = [...new Set(shows.map((s) => dayKey(s.startTime)))].sort();
    return keys;
  }, [shows]);

  const selectedDay = params.get('date') || days[0] || dayKey(new Date());
  const dayShows = shows.filter((s) => dayKey(s.startTime) === selectedDay);

  const byTheatre = useMemo(() => {
    const map = new Map<string, Show[]>();
    dayShows.forEach((s) => {
      const key = s.theatreName || 'Theatre';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [dayShows]);

  if (loading) return <div className="spinner" aria-label="Loading" />;
  if (!movie) return <div className="empty">{t('common.error')}</div>;

  return (
    <div>
      <h1 className="section-title">{movie.title}</h1>
      {movie.synopsis && <p className="section-sub">{movie.synopsis}</p>}
      <div className="day-tabs">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            className={`chip ${d === selectedDay ? 'active' : ''}`}
            onClick={() => setParams({ date: d }, { replace: true })}
          >
            {d}
          </button>
        ))}
      </div>
      {byTheatre.size === 0 ? (
        <div className="empty">{t('movie.noShows')}</div>
      ) : (
        [...byTheatre.entries()].map(([theatre, list]) => (
          <div key={theatre} className="panel" style={{ marginBottom: 16 }}>
            <h3>{theatre}</h3>
            <div className="showtime-row">
              {list.map((s) => (
                <Link key={s.id} className="showtime-btn" to={`/show/${s.id}`}>
                  {formatDateTime(s.startTime)}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
