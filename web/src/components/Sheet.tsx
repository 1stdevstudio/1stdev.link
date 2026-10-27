import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, title, children }) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus first input or button in sheet
    const timer = setTimeout(() => {
      const focusable = sheetRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), textarea:not([disabled])'
      );
      focusable?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

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
            aria-label="Tutup"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </>
  );
};
