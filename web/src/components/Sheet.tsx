import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/context';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, title, children }) => {
  const { tx } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]'
    ) || []).filter((el) => el.getClientRects().length > 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !sheetRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sheetRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    const frame = requestAnimationFrame(() => {
      if (!sheetRef.current?.contains(document.activeElement)) {
        const input = sheetRef.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled])');
        (input || focusables()[0])?.focus();
      }
    });
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="scrim panel3-scrim"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="sheet panel3-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="handle" />
        <div className="sheet-head">
          <h2 className="text-[18px] font-semibold tracking-tight text-[var(--tx)]">
            {title}
          </h2>
          <button
            type="button"
            className="iconbtn"
            onClick={onClose}
            aria-label={tx('Tutup', 'Close')}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </>
  );
};
