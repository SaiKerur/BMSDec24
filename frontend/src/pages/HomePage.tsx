import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import type { Movie } from '../types';
import { prettyGenre } from '../types';

const CITY_KEY = 'bms_cityId';

type Props = { cityId: string };

export function HomePage({ cityId }: Props) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const genre = params.get('genre') || '';
  const lang = params.get('lang') || '';
  const cert = params.get('cert') || '';
  const soon = params.get('soon') === '1';

  const [nowShowing, setNowShowing] = useState<Movie[]>([]);
  const [comingSoon, setComingSoon] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const cityQ = cityId ? `?cityId=${cityId}` : '';
      const [ns, cs] = await Promise.all([
        api<Movie[]>(`/catalog/movies/now-showing${cityQ}`),
        api<Movie[]>(`/catalog/movies/coming-soon`),
      ]);
      setNowShowing(ns);
      setComingSoon(cs);
      if (q) {
        setSearchResults(await api<Movie[]>(`/catalog/movies/search?q=${encodeURIComponent(q)}`));
      } else {
        setSearchResults(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [cityId, q, t]);

  useEffect(() => { void load(); }, [load]);

  const universe = [...nowShowing, ...comingSoon, ...(searchResults || [])];
  const genres = [...new Set(universe.map((m) => m.genre).filter(Boolean))].sort();
  const langs = [...new Set(universe.map((m) => m.language).filter(Boolean))].sort();
  const certs = [...new Set(universe.map((m) => m.certification).filter(Boolean))].sort();

  const applyFilters = (list: Movie[]) =>
    list.filter(
      (m) =>
        (!genre || m.genre === genre) &&
        (!lang || m.language === lang) &&
        (!cert || m.certification === cert),
    );

  const patch = (p: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(p).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    setParams(next, { replace: true });
  };

  if (loading) return <div className="skeleton-grid" aria-busy="true" />;

  if (error) {
    return (
      <div className="error-panel">
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void load()}>{t('common.retry')}</button>
      </div>
    );
  }

  const filterBar = (
    <div className="filters">
      {['', ...genres].map((g) => (
        <button
          key={g || 'all'}
          type="button"
          className={`chip ${genre === g ? 'active' : ''}`}
          aria-pressed={genre === g}
          onClick={() => patch({ genre: g })}
        >
          {g ? prettyGenre(g) : t('home.allGenres')}
        </button>
      ))}
      <select className="filter-select" value={lang} onChange={(e) => patch({ lang: e.target.value })} aria-label="Language">
        <option value="">All languages</option>
        {langs.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <select className="filter-select" value={cert} onChange={(e) => patch({ cert: e.target.value })} aria-label="Certification">
        <option value="">All ratings</option>
        {certs.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button
        type="button"
        className={`chip toggle-chip ${soon ? 'active' : ''}`}
        aria-pressed={soon}
        onClick={() => patch({ soon: soon ? '' : '1' })}
      >
        {soon ? '✓ ' : ''}{t('home.comingSoon')}
      </button>
      {(genre || lang || cert || soon || q) && (
        <button type="button" className="filters-reset" onClick={() => setParams({}, { replace: true })}>
          {t('home.clearFilters')}
        </button>
      )}
    </div>
  );

  let list: Movie[] = [];
  let title = t('home.nowShowing');
  if (q) {
    title = t('home.searchResults', { q });
    list = applyFilters(searchResults || []);
    if (soon) list = list.filter((m) => m.status === 'COMING_SOON');
  } else if (soon) {
    title = t('home.comingSoon');
    list = applyFilters(comingSoon);
  } else {
    list = applyFilters(nowShowing);
  }

  return (
    <div>
      <h1 className="section-title">{title}</h1>
      {filterBar}
      {list.length ? (
        <div className="movie-grid">
          {list.map((m) => (
            <Link key={m.id} className="movie-card" to={`/movie/${m.id}`}>
              <div className="poster">
                {m.certification && <span className="badge">{m.certification}</span>}
                {m.posterUrl ? <img src={m.posterUrl} alt="" loading="lazy" /> : '🎞️'}
              </div>
              <div className="meta">
                <h3>{m.title}</h3>
                <p>{[m.language, prettyGenre(m.genre), m.runtime ? `${m.runtime}m` : ''].filter(Boolean).join(' · ')}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">{t('home.noResults')}</div>
      )}
      {!q && !soon && applyFilters(comingSoon).length > 0 && (
        <>
          <h1 className="section-title" style={{ marginTop: 40 }}>{t('home.comingSoon')}</h1>
          <div className="movie-grid">
            {applyFilters(comingSoon).map((m) => (
              <Link key={m.id} className="movie-card" to={`/movie/${m.id}`}>
                <div className="poster"><span className="badge">Soon</span>{m.posterUrl ? <img src={m.posterUrl} alt="" /> : '🎞️'}</div>
                <div className="meta"><h3>{m.title}</h3></div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function getStoredCityId() {
  return localStorage.getItem(CITY_KEY) || '';
}

export function setStoredCityId(id: string) {
  localStorage.setItem(CITY_KEY, id);
}
