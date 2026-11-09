import React, { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Mail, UsersRound, Link2, MousePointer2, Hourglass, RefreshCw, Search, ChevronRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../../api';
import type { AuthSession, AdminOverview, AdminUserRow, AdminUserLink, AdminUserPage } from '../../types';
import { useI18n } from '../../i18n/context';
import '../../styles/admin-v1.css';

interface Props { session: AuthSession }

const fmt = (n: unknown) => Number(n || 0).toLocaleString('id-ID');
const date = (n: number) => n ? new Date(n * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const AdminScreen: React.FC<Props> = ({ session }) => {
  const { tx } = useI18n();
  const [unlocked, setUnlocked] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserPage | null>(null);
  const [status, setStatus] = useState<'all' | 'guest' | 'verified'>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<AdminUserLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    let alive = true;
    // Any previously verified token must still pass server-side expiration.
    Promise.all([api.getAdminOverview(), api.getAdminUsers('all', '', 0)])
      .then(([a, u]) => { if (alive) { setOverview(a); setUsers(u); setUnlocked(true); } })
      .catch(() => { if (alive) setUnlocked(false); });
    return () => { alive = false; };
  }, [session.id]);

  const load = async (nextOffset: number = offset, nextStatus: typeof status = status, nextQuery: string = query) => {
    setBusy(true);
    setError('');
    try {
      const [a, u] = await Promise.all([api.getAdminOverview(), api.getAdminUsers(nextStatus, nextQuery, nextOffset)]);
      setOverview(a);
      setUsers(u);
      setOffset(nextOffset);
      setStatus(nextStatus);
      setQuery(nextQuery);
      setSelected(null);
      setSelectedLinks([]);
      setUnlocked(true);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 401 || e.status === 403) {
        setUnlocked(false);
        sessionStorage.removeItem('edgelink_admin_stepup');
        setOtpSent(false);
        setError(tx('Sesi admin berakhir. Verifikasi ulang untuk melanjutkan.', 'Admin session expired. Verify again to continue.'));
      } else setError(e.message);
    } finally { setBusy(false); }
  };

  const sendOtp = async () => {
    setBusy(true); setError('');
    try { await api.sendAdminOtp(); setOtpSent(true); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) return;
    setBusy(true); setError('');
    try {
      await api.verifyAdminOtp(otp);
      setOtp('');
      const [a, u] = await Promise.all([api.getAdminOverview(), api.getAdminUsers('all', '', 0)]);
      setOverview(a); setUsers(u); setUnlocked(true); setOffset(0); setStatus('all'); setQuery('');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const chooseUser = async (user: AdminUserRow) => {
    setSelected(user); setSelectedLinks([]); setLoadingLinks(true);
    try {
      const data = await api.getAdminUserLinks(user.id);
      setSelectedLinks(data);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) { setUnlocked(false); setOtpSent(false); sessionStorage.removeItem('edgelink_admin_stepup'); }
      setError(err.message);
    } finally { setLoadingLinks(false); }
  };

  if (!unlocked) {
    return <div className="admin-v1">
      <div className="admin-card admin-stepup">
        <span className="admin-kicker">{tx('KONSOL PEMILIK · AKSES TERBATAS', 'OWNER CONSOLE · RESTRICTED ACCESS')}</span>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#18765d' }}>
          <ShieldCheck size={28} aria-hidden="true" />
          <span className="admin-tag">{tx('Verifikasi tambahan', 'Extra verification')}</span>
        </div>
        <h2>{tx('Buka Dashboard Admin', 'Unlock Admin Dashboard')}</h2>
        <p className="admin-muted">{tx(
          'Demi keamanan data pengguna, masukkan kode sekali pakai yang dikirim ke email akun terverifikasi. Sesi admin berlaku selama 30 menit.',
          'To protect user information, enter a one-time code sent to your verified account email. Admin access lasts 30 minutes.'
        )}</p>
        <p className="admin-muted" style={{ marginTop: 10 }}><Mail size={14} style={{ display:'inline', verticalAlign:'middle', marginRight: 7 }} />{session.email}</p>
        {error && <div role="alert" className="admin-error" style={{ marginTop: 16 }}>{error}</div>}
        {!otpSent ? (
          <button type="button" className="admin-btn" disabled={busy} style={{ marginTop: 22, width: '100%' }} onClick={() => void sendOtp()}>
            <KeyRound size={17} aria-hidden="true" />{busy ? tx('Mengirim…', 'Sending…') : tx('Kirim kode verifikasi', 'Send verification code')}
          </button>
        ) : (
          <form onSubmit={(e) => { void verify(e); }} style={{ display:'grid', gap: 12, marginTop: 20 }}>
            <label htmlFor="admin-otp" style={{ fontSize: 12, fontWeight: 700 }}>{tx('Kode 6 digit', 'Six-digit code')}</label>
            <input id="admin-otp" className="admin-field" type="text" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000" aria-label={tx('Kode verifikasi', 'Verification code')} required />
            <button type="submit" className="admin-btn" disabled={busy || otp.length !== 6}>{busy ? tx('Memverifikasi…', 'Verifying…') : tx('Verifikasi & masuk', 'Verify & enter')}</button>
            <button type="button" className="admin-btn subtle" disabled={busy} onClick={() => void sendOtp()}>
              {tx('Kirim ulang kode', 'Resend code')}
            </button>
          </form>
        )}
        <p className="admin-muted" style={{ marginTop: 20, fontSize: 11 }}>
          {tx('Data admin tidak tersedia tanpa akses akun dan OTP. Jangan bagikan kode verifikasi.', 'Admin data is unavailable without an authenticated account and OTP. Never share your code.')}
        </p>
      </div>
    </div>;
  }

  const cards = [
    { title: tx('Total pengguna', 'Total users'), count: overview?.users.total, detail: tx('Seluruh workspace', 'All workspaces'), Icon: UsersRound },
    { title: tx('Terverifikasi', 'Verified'), count: overview?.users.verified, detail: tx('Akun tersimpan', 'Saved accounts'), Icon: ShieldCheck },
    { title: tx('Total link', 'Total links'), count: overview?.links.total, detail: tx('Semua tipe blok', 'All block types'), Icon: Link2 },
    { title: tx('Klik 7 hari', 'Clicks in 7 days'), count: overview?.clicks.last_7d, detail: tx('Klik teragregasi', 'Aggregated clicks'), Icon: MousePointer2 },
  ];
  return <div className="admin-v1">
    <header className="admin-header">
      <div>
        <p className="admin-kicker">{tx('KHUSUS PEMILIK · PRIVATE', 'OWNER ONLY · PRIVATE')}</p>
        <h1>{tx('Dashboard Admin', 'Admin Dashboard')}</h1>
        <p className="admin-muted">{tx('Pantau pengguna, link, dan kesehatan operasional di satu tempat.', 'Monitor users, links, and platform operations in one place.')}</p>
      </div>
      <button type="button" className="admin-btn subtle" disabled={busy} onClick={() => void load()}>
        <RefreshCw size={15} aria-hidden="true" /> {tx('Segarkan data', 'Refresh data')}
      </button>
    </header>

    {error && <div role="alert" className="admin-error">{error}</div>}

    <div className="admin-grid" aria-label={tx('Ringkasan platform', 'Platform overview')}>
      {cards.map(({ title, count, detail, Icon }) => (
        <div className="admin-card admin-stat" key={title}>
          <span className="admin-muted" style={{ display:'flex', alignItems:'center', gap:7 }}><Icon size={15} aria-hidden="true" />{title}</span>
          <strong>{fmt(count)}</strong><small>{detail}</small>
        </div>
      ))}
    </div>

    <div className="admin-workgrid">
      <section className="admin-card" aria-label={tx('Daftar pengguna', 'User directory')}>
        <div className="admin-header">
          <div>
            <h2 style={{ fontWeight:800, fontSize:18 }}>{tx('Pengguna', 'Users')}</h2>
            <p className="admin-muted">{tx('Hanya metadata akun, tanpa kunci akses.', 'Account metadata only, no access keys.')}</p>
          </div>
          <span className="admin-tag">{fmt(overview?.users.guests)} {tx('tamu', 'guests')}</span>
        </div>
        <form className="admin-filters" onSubmit={(e) => { e.preventDefault(); void load(0, status, search); }}>
          <div className="admin-search" style={{ position:'relative' }}>
            <Search size={16} style={{ position:'absolute', left:12, top:13, color:'#78917f' }} aria-hidden="true" />
            <input className="admin-field" style={{ paddingLeft:38 }} value={search} onChange={(e)=>setSearch(e.target.value)} maxLength={64}
              placeholder={tx('Cari nama, handle, atau email', 'Search name, handle, or email')} aria-label={tx('Cari pengguna', 'Search users')}/>
          </div>
          <select className="admin-field admin-filter-select" value={status} onChange={(e) => void load(0, e.target.value as typeof status, query)} aria-label={tx('Filter pengguna', 'Filter users')}>
            <option value="all">{tx('Semua akun', 'All users')}</option>
            <option value="verified">{tx('Terverifikasi', 'Verified')}</option>
            <option value="guest">{tx('Tamu', 'Guests')}</option>
          </select>
          <button type="submit" className="admin-btn" disabled={busy}>{tx('Cari', 'Search')}</button>
        </form>
        <div className="admin-list" role="list">
          {(users?.users || []).map((user) => (
            <button role="listitem" className={'admin-person' + (selected?.id === user.id ? ' active' : '')} key={user.id}
              type="button" onClick={() => void chooseUser(user)} aria-label={tx('Lihat link milik ', 'View links for ') + (user.handle || user.id)}>
              <span className="admin-avatar" aria-hidden="true">{(user.display_name || user.handle || 'U').slice(0,1).toUpperCase()}</span>
              <span className="admin-person-copy">
                <strong>{user.display_name || '@' + (user.handle || 'creator')}</strong>
                <small>@{user.handle || '—'} · {user.email_masked || tx('Akun tamu', 'Guest')} · {fmt(user.links_count)} link</small>
              </span>
              <span className={'admin-tag' + (user.is_guest ? ' guest' : '')}>{user.is_guest ? tx('Tamu', 'Guest') : tx('Aktif', 'Verified')}</span>
              <ChevronRight size={16} style={{ color:'#809689', flexShrink:0 }} aria-hidden="true"/>
            </button>
          ))}
          {users?.users.length === 0 && <p className="admin-muted" style={{ padding:14 }}>{tx('Tidak ada pengguna yang cocok.', 'No matching users.')}</p>}
        </div>
        <div className="admin-list-footer">
          <button type="button" className="admin-btn subtle" disabled={busy || offset===0} onClick={() => void load(Math.max(0,offset-25))}>
            <ArrowLeft size={15} aria-hidden="true" /> {tx('Sebelumnya', 'Previous')}
          </button>
          <span className="admin-muted">{tx('Halaman', 'Page')} {Math.floor(offset/25)+1}</span>
          <button type="button" className="admin-btn subtle" disabled={busy || !users?.has_more} onClick={() => void load(offset+25)}>
            {tx('Berikutnya', 'Next')} <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </section>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <section className="admin-card" aria-label={tx('Detail link pengguna', 'User link details')}>
          <h2 style={{ fontWeight:800, fontSize:18 }}>{tx('Detail link', 'Link details')}</h2>
          {!selected ? <p className="admin-muted" style={{ marginTop:12 }}>
            {tx('Pilih pengguna untuk melihat daftar link miliknya.', 'Select a user to view their links.')}
          </p> : <>
            <p className="admin-muted" style={{ marginTop:6 }}>@{selected.handle} · {date(selected.created_at)}</p>
            {loadingLinks ? <p className="admin-muted" style={{ marginTop:12 }}>{tx('Memuat link…', 'Loading links…')}</p> :
              selectedLinks.length===0 ? <p className="admin-muted" style={{ marginTop:12 }}>{tx('Belum ada link.', 'No links yet.')}</p> :
              <div style={{ marginTop:12 }}>
                {selectedLinks.map(l => <div key={l.id} className="admin-link">
                  <strong>{l.title || l.slug}</strong>
                  <small>/{l.slug} · {fmt(l.clicks)} {tx('klik', 'clicks')} · {l.is_active ? tx('Aktif', 'Active') : tx('Nonaktif', 'Inactive')}</small>
                  {/^https?:\/\//i.test(l.destination_url) && <a href={l.destination_url} target="_blank" rel="noopener noreferrer">
                    {l.destination_url} <ExternalLink size={12} style={{ display:'inline', marginLeft:4 }} aria-hidden="true"/>
                  </a>}
                </div>)}
              </div>}
          </>}
        </section>

        <section className="admin-card" aria-label={tx('Pembersihan akun tamu', 'Guest cleanup')}>
          <div className="admin-header">
            <h2 style={{ fontWeight:800, fontSize:18 }}>{tx('Siklus akun tamu', 'Guest lifecycle')}</h2>
            <Hourglass size={19} color="#18765d" aria-hidden="true"/>
          </div>
          <p className="admin-muted" style={{ marginTop:10 }}>
            {tx('Akun belum diklaim akan kedaluwarsa setelah 7 hari, dengan masa transisi untuk akun lama.', 'Unclaimed accounts expire after 7 days, with a grace period for legacy guests.')}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:15 }}>
            <div className="admin-header"><span className="admin-muted">{tx('Tamu aktif', 'Guest accounts')}</span><strong>{fmt(overview?.users.guests)}</strong></div>
            <div className="admin-header"><span className="admin-muted">{tx('Antrean pembersihan', 'Pending cleanup jobs')}</span><strong>{fmt(overview?.cleanup.pending)}</strong></div>
            <div className="admin-header"><span className="admin-muted">{tx('Tamu berusia lebih dari 7 hari', 'Guests older than 7 days')}</span><strong>{fmt(overview?.cleanup.old_guests)}</strong></div>
          </div>
          <p className="admin-hint" style={{ marginTop:18 }}>
            {tx('Cron otomatis setiap hari pukul 10.30 WIB, maksimal 5 akun tamu per eksekusi. Admin tidak dapat menghapus akun massal dari panel ini.', 'Daily cleanup at 10:30 Jakarta time, at most 5 guests per run. Bulk deletion is not available in this console.')}
          </p>
        </section>
        <p className="admin-muted" style={{ fontSize:11 }}>
          {tx('Data diperbarui saat kamu menekan Segarkan. Statistik klik adalah agregat, bukan jumlah pengunjung unik.', 'Press Refresh to update. Click totals are aggregates, not unique visitors.')}
        </p>
      </div>
    </div>
  </div>;
};
