import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

export const LOCALE_KEY = 'bms_locale';
export const CURRENCY_KEY = 'bms_currency';

export type AppLocale = 'en' | 'hi';

const saved = (localStorage.getItem(LOCALE_KEY) as AppLocale) || 'en';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

export function setLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_KEY, locale);
  void i18n.changeLanguage(locale);
}

export function getLocale(): AppLocale {
  return (i18n.language as AppLocale) || 'en';
}

export function getCurrency(): string {
  return localStorage.getItem(CURRENCY_KEY) || 'INR';
}

export function setCurrency(code: string) {
  localStorage.setItem(CURRENCY_KEY, code);
}

export function formatMoney(amount: number, currency = getCurrency(), locale = getLocale()) {
  return new Intl.NumberFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDateTime(value: string | Date, locale = getLocale()) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString(locale === 'hi' ? 'hi-IN' : undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
