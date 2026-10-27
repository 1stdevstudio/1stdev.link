import React from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="toast on" role="status" aria-live="polite">
      <Check size={18} strokeWidth={2} className="text-[var(--ok)]" />
      <span>{message}</span>
    </div>
  );
};
