export type City = { id: number; name: string };

export type Movie = {
  id: number;
  title: string;
  genre?: string;
  language?: string;
  certification?: string;
  runtime?: number;
  posterUrl?: string;
  status?: string;
  cast?: string;
  synopsis?: string;
};

export type Show = {
  id: number;
  movieId: number;
  movieTitle?: string;
  theatreName?: string;
  screenName?: string;
  startTime: string;
};

export type ShowSeat = {
  showSeatId: number;
  seatId: number;
  seatNumber: string;
  seatStatus: 'AVAILABLE' | 'BLOCKED' | 'BOOKED';
  price: number;
  seatType?: string;
  updatedAtEpochMs?: number;
};

export type ShowAvailability = {
  showId: number;
  availableSeats: number;
  blockedSeats: number;
  bookedSeats: number;
  totalSeats: number;
  serverTimeEpochMs: number;
  seats: ShowSeat[];
};

export type Booking = {
  id: number;
  status: string;
  totalAmount: number;
  holdExpiresAt?: string;
  movieName?: string;
  theatreName?: string;
  seats?: { seatNumber: string }[];
  show?: { startTime: string };
};

export type PaymentInit = {
  paymentId: number;
  bookingId: number;
  provider: 'STRIPE' | 'RAZORPAY';
  status: string;
  amount: number;
  currency: string;
  gatewayOrderId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  publishableKey?: string;
};

export type Ticket = {
  bookingReference?: string;
  qrPayload?: string;
  movieName?: string;
  theatreName?: string;
  status: string;
  issuedAt?: string;
  seatCount?: number;
};

export type Refund = {
  id: number;
  status: string;
  refundAmount: number;
  policyPercent?: number;
};

export type UserProfile = {
  userId: number;
  email: string;
  name: string;
  role: string;
};

export type ShowMeta = {
  id: number;
  movieId?: number;
  movieTitle?: string;
  theatreName?: string;
  screenName?: string;
  startTime?: string;
};

export function cacheShow(s: Show) {
  if (!s?.id) return;
  const meta: ShowMeta = {
    id: s.id,
    movieId: s.movieId,
    movieTitle: s.movieTitle,
    theatreName: s.theatreName,
    screenName: s.screenName,
    startTime: s.startTime,
  };
  try {
    sessionStorage.setItem(`bms_show_${s.id}`, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

export function getCachedShow(id: number): ShowMeta | null {
  try {
    return JSON.parse(sessionStorage.getItem(`bms_show_${id}`) || 'null');
  } catch {
    return null;
  }
}

export function prettyGenre(g?: string) {
  const map: Record<string, string> = {
    ACTION: 'Action',
    COMEDY: 'Comedy',
    ROM_COM: 'Rom-Com',
    DRAMA: 'Drama',
    THRILLER: 'Thriller',
    HORROR: 'Horror',
    SCI_FI: 'Sci-Fi',
  };
  return (g && map[g]) || g || '';
}

export function dayKey(d: Date | string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
