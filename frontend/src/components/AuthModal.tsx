import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

type Props = {
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (name: string, email: string, password: string) => Promise<void>;
};

export function AuthModalGate({ onClose, onLogin, onSignup }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (tab === 'login') {
        await onLogin(String(fd.get('email')), String(fd.get('password')));
      } else {
        await onSignup(String(fd.get('name')), String(fd.get('email')), String(fd.get('password')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <div className="tabs" role="tablist">
          <button
            type="button"
            className={`tab ${tab === 'login' ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === 'login'}
            onClick={() => setTab('login')}
          >
            {t('nav.login')}
          </button>
          <button
            type="button"
            className={`tab ${tab === 'signup' ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => setTab('signup')}
          >
            {t('nav.signup')}
          </button>
        </div>
        <form onSubmit={submit} className="auth-form">
          <h2>{tab === 'login' ? t('auth.welcome') : t('auth.createAccount')}</h2>
          {tab === 'signup' && (
            <div className="field">
              <input name="name" placeholder="Full name" required aria-label="Full name" />
            </div>
          )}
          <div className="field">
            <input name="email" type="email" placeholder="Email" required autoComplete="email" />
          </div>
          <div className="field">
            <input name="password" type="password" placeholder="Password" required minLength={8} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" variant="primary" block disabled={busy}>
            {busy ? t('common.loading') : tab === 'login' ? t('nav.login') : t('nav.signup')}
          </Button>
          {tab === 'login' && (
            <Button
              type="button"
              variant="ghost"
              block
              onClick={() => {
                const form = document.querySelector('.auth-form') as HTMLFormElement;
                const email = form?.querySelector('[name=email]') as HTMLInputElement;
                const password = form?.querySelector('[name=password]') as HTMLInputElement;
                if (email) email.value = 'john.seed@example.com';
                if (password) password.value = 'Password@123';
              }}
            >
              {t('auth.fillDemo')}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
