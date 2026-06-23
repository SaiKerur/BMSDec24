import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

type NotifyContextValue = {
  notify: (message: string, type?: Toast['type']) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
};

const NotifyContext = createContext<NotifyContextValue | null>(null);
let nextId = 1;

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => dismiss(id), 3600);
  }, [dismiss]);

  const value = useMemo(() => ({ notify, toasts, dismiss }), [notify, toasts, dismiss]);

  return <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>;
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify outside NotifyProvider');
  return ctx;
}
