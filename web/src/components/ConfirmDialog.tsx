import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/context';

// Pengganti window.confirm(): dialog di dalam aplikasi, sesuai desain, bisa diterjemahkan.
// Pakai: const confirm = useConfirm(); if (await confirm({ title, danger: true })) { ... }

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tx } = useI18n();
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        lastFocus.current = document.activeElement as HTMLElement | null;
        setState({ ...opts, resolve });
      }),
    []
  );

  const close = useCallback(
    (value: boolean) => {
      state?.resolve(value);
      setState(null);
      lastFocus.current?.focus?.();
    },
    [state]
  );

  useEffect(() => {
    if (!state) return;
    // Fokus awal di "Batal": aksi berbahaya tidak terpicu oleh Enter yang tak sengaja.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="cfm-wrap" onPointerDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="cfm" role="alertdialog" aria-modal="true" aria-labelledby="cfm-t" aria-describedby={state.message ? 'cfm-m' : undefined}>
            <h2 id="cfm-t" className="text-[17px] font-semibold text-[var(--tx)]">{state.title}</h2>
            {state.message && <p id="cfm-m" className="small muted mt-1.5 leading-relaxed">{state.message}</p>}
            <div className="cfm-actions">
              <button ref={cancelRef} type="button" className="btn btn-g" onClick={() => close(false)}>
                {state.cancelLabel || tx('Batal', 'Cancel')}
              </button>
              <button type="button" className={`btn ${state.danger ? 'btn-danger' : 'btn-p'}`} onClick={() => close(true)}>
                {state.confirmLabel || tx('Lanjut', 'Continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
