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
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus only when sheet first opens, and never steal focus if user is already typing
    if (!prevOpenRef.current) {
      prevOpenRef.current = true;
      const timer = setTimeout(() => {
        if (sheetRef.current && !sheetRef.current.contains(document.activeElement)) {
          const firstInput = sheetRef.current.querySelector<HTMLElement>(
            'input:not([disabled]), textarea:not([disabled])'
          );
          if (firstInput) {
            firstInput.focus();
          } else {
            const focusable = sheetRef.current.querySelector<HTMLElement>(
              'button:not([disabled])'
            );
            focusable?.focus();
          }
        }
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="scrim"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="sheet"
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
