import React from 'react';
import { Link2, ArrowUpRight } from 'lucide-react';
import { useI18n } from '../../i18n/context';

/** Shared navigation for both first-visit marketing routes. */
export const SiteHeader: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { tx } = useI18n();

  return (
    <header className="start-header site-header">
      <a href="/" className="start-logo" aria-label="1stdev.link">
        <span className="start-logo-symbol" aria-hidden="true"><Link2 size={21} strokeWidth={2.2} /></span>
        <span className="start-logo-type"><strong>1stdev<span>.link</span></strong><small>by 1stdev.space</small></span>
      </a>
      <nav className="start-nav" aria-label={tx('Navigasi halaman depan', 'Homepage navigation')}>
        <a href="/#start-highlights">{tx('Keunggulan', 'Benefits')}</a>
        <a href="/#start-goals">{tx('Buat halaman', 'Create a page')}</a>
        <button type="button" className="start-login" onClick={onOpenLogin}>
          {tx('Masuk', 'Log in')} <ArrowUpRight size={17} strokeWidth={2} aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
};
