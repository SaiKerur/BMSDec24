import { useNotify } from '../context/NotifyContext';

export function Notifications() {
  const { toasts, dismiss } = useNotify();
  const icons = { success: '✓', error: '⚠️', info: 'ℹ️' };

  return (
    <div className="notifications" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`notification ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
          <span className="notif-icon" aria-hidden="true">{icons[t.type]}</span>
          <span className="notif-msg">{t.message}</span>
          <button type="button" className="notif-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
