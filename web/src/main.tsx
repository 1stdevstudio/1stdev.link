import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n/context';
import { api } from './api';
import './index.css';
// Namespaced homepage v3 rules load after the legacy workspace stylesheet.
import './styles/welcome-v3.css';
// Isolated full workspace refresh. Public bio themes and marketing stay untouched.
import './styles/panel-v3.css';
import { ConfirmProvider } from './components/ConfirmDialog';

/**
 * Domain utama: 1stdev.link. Pengunjung domain lama (link.1stnear.com, *.pages.dev) dipindahkan ke sana.
 * Token tersimpan per domain, jadi yang sudah masuk dibawa lewat kode handoff sekali pakai.
 * Kalau handoff gagal, aplikasi tetap jalan di domain lama supaya tidak ada yang terkunci.
 */
const PRIMARY_ORIGIN = import.meta.env.VITE_API_URL || '';

const isLegacyHost = (() => {
  if (!PRIMARY_ORIGIN || import.meta.env.VITE_USE_MOCK === 'true') return false;
  const host = window.location.hostname;
  return host !== new URL(PRIMARY_ORIGIN).hostname && (host.endsWith('.pages.dev') || host === 'link.1stnear.com');
})();

function render() {
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

async function moveToPrimary() {
  const target = new URL(`${PRIMARY_ORIGIN}${window.location.pathname}${window.location.search}`);
  let token: string | null = null;
  try {
    token = localStorage.getItem('edgelink_token');
  } catch {
    /* storage diblokir: perlakukan sebagai pengunjung baru */
  }
  if (!token) return window.location.replace(target.toString());
  try {
    target.searchParams.set('handoff', await api.createHandoff());
    window.location.replace(target.toString());
  } catch {
    render();
  }
}

if (isLegacyHost) void moveToPrimary();
else render();
