import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { setLocale, setCurrency, getCurrency, type AppLocale } from '../../lib/i18n';
import type { City } from '../../types';

type Props = {
  cities: City[];
  cityId: string;
  onCityChange: (id: string) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
};

export function Topbar({ cities, cityId, onCityChange, searchQuery, onSearch }: Props) {
  const { t, i18n } = useTranslation();
  const { loggedIn, user, logout } = useAuth();
  const { mode, toggle } = useTheme();
  const location = useLocation();

  const goSearch = (q: string) => {
    if (location.pathname.startsWith('/home') || location.pathname === '/') {
      onSearch(q);
    } else {
      window.location.hash = `#/home?q=${encodeURIComponent(q)}`;
    }
  };

  return (
    <header className="topbar">
      <Link className="brand" to="/home" aria-label="BookMyShow home">
        🎬 <span>Book<b>My</b>Show</span>
      </Link>
      <form
        className="topbar-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get('q') as string;
          goSearch(q);
        }}
      >
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          name="q"
          defaultValue={searchQuery}
          placeholder="Search movies, casts…"
          aria-label="Search movies"
        />
      </form>
      <div className="topbar-right">
        <select
          className="city-select"
          value={cityId}
          onChange={(e) => onCityChange(e.target.value)}
          aria-label="City"
        >
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="city-select"
          value={i18n.language}
          onChange={(e) => setLocale(e.target.value as AppLocale)}
          aria-label={t('common.language')}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
        </select>
        <select
          className="city-select"
          value={getCurrency()}
          onChange={(e) => setCurrency(e.target.value)}
          aria-label={t('common.currency')}
        >
          <option value="INR">INR ₹</option>
          <option value="USD">USD $</option>
        </select>
        <button
          type="button"
          className="btn btn-ghost theme-toggle"
          onClick={toggle}
          aria-label={mode === 'dark' ? t('common.themeLight') : t('common.themeDark')}
        >
          {mode === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="auth-area">
          {loggedIn && user ? (
            <>
              <Link to="/profile" className="user-chip-btn user-chip">
                <b>{user.email.split('@')[0]}</b>
              </Link>
              <Link to="/bookings" className="btn btn-ghost">{t('nav.bookings')}</Link>
              <button type="button" className="btn btn-ghost" onClick={logout}>{t('nav.logout')}</button>
            </>
          ) : (
            <span className="user-chip">{t('nav.login')} to book</span>
          )}
        </div>
      </div>
    </header>
  );
}
