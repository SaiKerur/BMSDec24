import { HashRouter, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './lib/api';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotifyProvider } from './context/NotifyContext';
import { Topbar } from './components/layout/Topbar';
import { Notifications } from './components/Notifications';
import { HomePage, getStoredCityId, setStoredCityId } from './pages/HomePage';
import { MoviePage } from './pages/MoviePage';
import { ShowPage } from './pages/ShowPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TicketPage } from './pages/TicketPage';
import { BookingsPage } from './pages/BookingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RefundPage } from './pages/RefundPage';
import type { City } from './types';
import './styles/global.css';

function SearchSync({ onQuery }: { onQuery: (q: string) => void }) {
  const [params] = useSearchParams();
  useEffect(() => {
    onQuery(params.get('q') || '');
  }, [params, onQuery]);
  return null;
}

function AppShell() {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState(getStoredCityId());
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    void api<City[]>('/catalog/cities').then((list) => {
      setCities(list);
      if (!cityId && list.length) {
        setCityId(String(list[0].id));
        setStoredCityId(String(list[0].id));
      }
    });
  }, [cityId]);

  const onCityChange = (id: string) => {
    setCityId(id);
    setStoredCityId(id);
  };

  const onSearch = (q: string) => {
    navigate(`/home?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <Topbar
        cities={cities}
        cityId={cityId}
        onCityChange={onCityChange}
        searchQuery={searchQuery}
        onSearch={onSearch}
      />
      <main className="view">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<><SearchSync onQuery={setSearchQuery} /><HomePage cityId={cityId} /></>} />
          <Route path="/movie/:id" element={<MoviePage />} />
          <Route path="/show/:id" element={<ShowPage />} />
          <Route path="/checkout/:bookingId" element={<CheckoutPage />} />
          <Route path="/ticket/:bookingId" element={<TicketPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/refund/:refundId" element={<RefundPage />} />
        </Routes>
      </main>
      <Notifications />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotifyProvider>
        <AuthProvider>
          <HashRouter>
            <AppShell />
          </HashRouter>
        </AuthProvider>
      </NotifyProvider>
    </ThemeProvider>
  );
}
