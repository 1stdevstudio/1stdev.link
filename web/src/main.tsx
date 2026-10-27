import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n/context';
import './index.css';
import { ConfirmProvider } from './components/ConfirmDialog';

/**
 * Domain utama: link.1stnear.com. Pengunjung *.pages.dev tanpa sesi dialihkan ke sana.
 * Yang sudah punya sesi di pages.dev tidak dialihkan, karena token tersimpan per domain.
 */
const PRIMARY_ORIGIN = import.meta.env.VITE_API_URL || '';
const shouldMoveToPrimary = (() => {
  try {
    return (
      Boolean(PRIMARY_ORIGIN) &&
      window.location.hostname.endsWith('.pages.dev') &&
      !localStorage.getItem('edgelink_token')
    );
  } catch {
    return false;
  }
})();

if (shouldMoveToPrimary) {
  window.location.replace(`${PRIMARY_ORIGIN}${window.location.pathname}${window.location.search}`);
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <I18nProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </I18nProvider>
    </React.StrictMode>
  );
}
