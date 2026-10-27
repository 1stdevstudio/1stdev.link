import React, { useEffect, useState } from 'react';
import {
  Link2,
  User,
  Activity,
  RefreshCw,
  TrendingUp,
  Shield,
  Check,
  X,
  QrCode,
  LogIn,
  Copy,
} from 'lucide-react';
import { api } from './api';
import { LinkItem, LinkAnalytics, BioProfile, AuthSession } from './types';
import { LinkManager } from './components/LinkManager';
import { BioProfileBuilder } from './components/BioProfileBuilder';
import { AnalyticsModal } from './components/AnalyticsModal';
import { LegalModal } from './components/LegalModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'links' | 'bio'>('links');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [profile, setProfile] = useState<BioProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLinkForAnalytics, setSelectedLinkForAnalytics] = useState<LinkItem | null>(null);
  const [analyticsData, setAnalyticsData] = useState<LinkAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);

  // Claim Modal States (2-Step OTP)
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimOtp, setClaimOtp] = useState('');
  const [claimStep, setClaimStep] = useState<1 | 2>(1);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Login Modal States (OTP & Sync Key)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMode, setLoginMode] = useState<'otp' | 'key'>('otp');
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginKey, setLoginKey] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginMsg, setLoginMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copiedSync, setCopiedSync] = useState(false);

  // Send OTP for Claim
  const handleSendClaimOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimEmail.trim()) return;
    try {
      setClaiming(true);
      setClaimMsg(null);
      const res = await api.sendOtp(claimEmail.trim(), 'claim');
      setClaimStep(2);
      setClaimMsg({
        type: 'success',
        text: res.dev_code
          ? `Code generated: ${res.dev_code} (sandbox preview)`
          : `Verification code sent to ${claimEmail.trim()}`,
      });
    } catch (err: any) {
      setClaimMsg({ type: 'error', text: err.message || 'Failed to send verification code' });
    } finally {
      setClaiming(false);
    }
  };

  // Verify OTP for Claim
  const handleVerifyClaimOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimOtp.trim()) return;
    try {
      setClaiming(true);
      setClaimMsg(null);
      const verified = await api.verifyOtp(claimEmail.trim(), claimOtp.trim(), 'claim');
      setSession(verified);
      setClaimMsg({ type: 'success', text: 'Email successfully verified & permanent!' });
      setTimeout(() => {
        setShowClaimModal(false);
        setClaimStep(1);
        setClaimOtp('');
      }, 1500);
    } catch (err: any) {
      setClaimMsg({ type: 'error', text: err.message || 'Verification failed' });
    } finally {
      setClaiming(false);
    }
  };

  // Send OTP for Login
  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    try {
      setLoggingIn(true);
      setLoginMsg(null);
      const res = await api.sendOtp(loginEmail.trim(), 'login');
      setLoginStep(2);
      setLoginMsg({
        type: 'success',
        text: res.dev_code
          ? `Code generated: ${res.dev_code} (sandbox preview)`
          : `Verification code sent to ${loginEmail.trim()}`,
      });
    } catch (err: any) {
      setLoginMsg({ type: 'error', text: err.message || 'Failed to send login code' });
    } finally {
      setLoggingIn(false);
    }
  };

  // Verify OTP for Login
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtp.trim()) return;
    try {
      setLoggingIn(true);
      setLoginMsg(null);
      const newSession = await api.verifyOtp(loginEmail.trim(), loginOtp.trim(), 'login');
      setSession(newSession);
      setLoginMsg({ type: 'success', text: 'Login verified!' });
      setShowLoginModal(false);
      setLoginStep(1);
      setLoginOtp('');
      // Reload links & profile for this account
      const [allLinks, bioProf] = await Promise.all([api.getLinks(), api.getBioProfile()]);
      setLinks(allLinks);
      setProfile(bioProf);
    } catch (err: any) {
      setLoginMsg({ type: 'error', text: err.message || 'Verification failed' });
    } finally {
      setLoggingIn(false);
    }
  };

  // Login via Sync Key directly
  const handleLoginByKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim()) return;
    try {
      setLoggingIn(true);
      setLoginMsg(null);
      const newSession = await api.login(loginKey.trim());
      setSession(newSession);
      setShowLoginModal(false);
      setLoginKey('');
      const [allLinks, bioProf] = await Promise.all([api.getLinks(), api.getBioProfile()]);
      setLinks(allLinks);
      setProfile(bioProf);
    } catch (err: any) {
      setLoginMsg({ type: 'error', text: err.message || 'Failed to connect workspace' });
    } finally {
      setLoggingIn(false);
    }
  };

  const getSyncUrl = () => {
    const key = session?.api_key || localStorage.getItem('edgelink_token') || '';
    return `${window.location.origin}?sync_key=${key}`;
  };

  const copySyncLink = () => {
    navigator.clipboard.writeText(getSyncUrl());
    setCopiedSync(true);
    setTimeout(() => setCopiedSync(false), 2000);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const userSession = await api.initSession();
      setSession(userSession);
      const [allLinks, bioProf] = await Promise.all([api.getLinks(), api.getBioProfile()]);
      setLinks(allLinks);
      setProfile(bioProf);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleCreateLink = async (payload: {
    destination_url: string;
    slug?: string;
    title?: string;
    is_bio_entry?: boolean;
    ios_url?: string;
    android_url?: string;
  }) => {
    const created = await api.createLink(payload);
    setLinks((prev) => [created, ...prev]);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await api.toggleLinkActive(id, !current);
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_active: !current ? 1 : 0 } : l))
    );
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Hapus tautan ini secara permanen?')) return;
    await api.deleteLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLinkBlockType = async (id: string, blockType: import('./types').BioBlockType) => {
    await api.updateLinkBlockType(id, blockType);
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, block_type: blockType } : l)));
  };

  const handleOpenAnalytics = async (link: LinkItem) => {
    setSelectedLinkForAnalytics(link);
    setAnalyticsLoading(true);
    try {
      const data = await api.getLinkAnalytics(link.id);
      setAnalyticsData(data);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleUpdateProfile = async (updated: Partial<BioProfile>) => {
    const res = await api.updateBioProfile(updated);
    setProfile(res);
  };

  const handleReorderLinks = async (updatedBioLinks: LinkItem[]) => {
    const map = new Map(updatedBioLinks.map((l) => [l.id, l]));
    setLinks((prev) => prev.map((l) => map.get(l.id) || l));
    await api.updateLinkOrder(
      updatedBioLinks.map((l) => ({ id: l.id, sort_order: l.sort_order }))
    );
  };

  const bioLinks = links
    .filter((l) => Boolean(l.is_bio_entry))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const activeCount = links.filter((l) => l.is_active === 1).length;
  const topLink = links.length > 0
    ? [...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0]
    : null;

  return (
    <div className="relative min-h-screen bg-[#07080c] text-neutral-100 selection:bg-white/20 font-sans">
      {/* Subtle ambient lighting */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />

      {/* Modern Floating Header (Zero Border) */}
      <header className="relative z-40 max-w-6xl mx-auto pt-6 px-4 sm:px-6">
        <div className="bg-white/[0.035] backdrop-blur-2xl rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-lg shadow-cyan-500/20">
              EL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white">EdgeLink</span>
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  100% Gratis
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'links'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Link2 size={13} />
              <span>Tautan Saya</span>
            </button>
            <button
              onClick={() => setActiveTab('bio')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === 'bio'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={13} />
              <span>Laman Profil</span>
              {bioLinks.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300">
                  {bioLinks.length}
                </span>
              )}
            </button>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            {session?.is_guest ? (
              <button
                onClick={() => {
                  setClaimMsg(null);
                  setShowClaimModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono transition cursor-pointer"
                title="Sesi publik sementara. Klik untuk tautkan email permanen."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Guest • Klaim Akun</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] text-xs font-mono text-neutral-300">
                <Shield size={12} className="text-emerald-400" />
                <span className="truncate max-w-[120px]">{session?.email || 'Verified'}</span>
              </div>
            )}

            {/* Device Sync QR Button */}
            <button
              onClick={() => setShowSyncModal(true)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
              title="Buka di HP / Scan QR Code"
            >
              <QrCode size={14} />
            </button>

            {/* Sign In / Switch Account Button */}
            <button
              onClick={() => {
                setLoginMsg(null);
                setShowLoginModal(true);
              }}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
              title="Masuk / Pindah Akun"
            >
              <LogIn size={14} />
            </button>

            <button
              onClick={loadInitialData}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20 space-y-8">
        {/* Luxury Hero Metrics Grid (Zero Border) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.025] backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-300">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-medium tracking-wide">Total Pengunjung</span>
              <Activity size={14} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {totalClicks.toLocaleString()}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 font-mono">total klik pengunjung</div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.025] backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-300">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-medium tracking-wide">Tautan Aktif</span>
              <Link2 size={14} className="text-indigo-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {activeCount} <span className="text-xs font-normal text-neutral-500 font-sans">/ {links.length}</span>
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-1 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Siap diakses publik
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.025] backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-300">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-medium tracking-wide">Tautan Terpopuler</span>
              <TrendingUp size={14} className="text-amber-400" />
            </div>
            <div className="text-xl font-bold tracking-tight text-white font-mono truncate">
              {topLink ? `/${topLink.slug}` : '-'}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 font-mono truncate">
              {topLink ? `${(topLink.clicks || 0).toLocaleString()} klik` : 'Belum ada data'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.025] backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-300">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-medium tracking-wide">Biaya Layanan</span>
              <Shield size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              Rp 0
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 font-mono">100% gratis &amp; bebas iklan</div>
          </div>
        </section>

        {/* Tab Content Views */}
        {loading ? (
          <div className="p-20 text-center text-xs font-mono text-neutral-500">
            Memuat data...
          </div>
        ) : (
          <>
            {activeTab === 'links' && (
              <LinkManager
                links={links}
                onCreateLink={handleCreateLink}
                onToggleActive={handleToggleActive}
                onDeleteLink={handleDeleteLink}
                onOpenAnalytics={handleOpenAnalytics}
              />
            )}

            {activeTab === 'bio' && profile && (
              <BioProfileBuilder
                profile={profile}
                bioLinks={bioLinks}
                onUpdateProfile={handleUpdateProfile}
                onReorderLinks={handleReorderLinks}
                onUpdateLinkBlockType={handleUpdateLinkBlockType}
              />
            )}
          </>
        )}
      </main>

      {/* Global Borderless Footer with Legal Terms & Privacy */}
      <footer className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 py-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-sans">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">EdgeLink</span>
          <span>&bull;</span>
          <span>Platform Tautan Ringkas &amp; Laman Bio 100% Gratis</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-400 font-medium">
          <button
            onClick={() => setShowLegal('terms')}
            className="hover:text-white transition cursor-pointer"
          >
            Ketentuan Layanan
          </button>
          <span>&bull;</span>
          <button
            onClick={() => setShowLegal('privacy')}
            className="hover:text-white transition cursor-pointer"
          >
            Kebijakan Privasi
          </button>
        </div>
      </footer>

      {/* Analytics Modal Drawer */}
      {selectedLinkForAnalytics && (
        <AnalyticsModal
          link={selectedLinkForAnalytics}
          analytics={analyticsData}
          loading={analyticsLoading}
          onClose={() => {
            setSelectedLinkForAnalytics(null);
            setAnalyticsData(null);
          }}
        />
      )}

      {/* Claim Guest Workspace Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md p-6 bg-[#0c0d12] rounded-3xl shadow-2xl shadow-black/80 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Claim Permanent Workspace
                </h3>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Your links and bio profile are currently tied to this browser session. Link your permanent email address so you never lose access.
            </p>

            {claimMsg && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  claimMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-rose-500/10 text-rose-300'
                }`}
              >
                {claimMsg.type === 'success' ? <Check size={14} /> : <X size={14} />}
                <span>{claimMsg.text}</span>
              </div>
            )}

            {claimStep === 1 ? (
              <form onSubmit={handleSendClaimOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-black/40 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    Later
                  </button>
                  <button
                    type="submit"
                    disabled={claiming}
                    className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all shadow-lg shadow-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    {claiming ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyClaimOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
                    Enter 6-Digit Code sent to {claimEmail}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={claimOtp}
                    onChange={(e) => setClaimOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 text-center tracking-[8px] font-mono font-bold text-base bg-black/40 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setClaimStep(1)}
                    className="text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={claiming || claimOtp.length < 6}
                    className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all shadow-lg shadow-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    {claiming ? 'Verifying...' : 'Verify & Claim'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Connect / Sign In Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md p-6 bg-[#0c0d12] rounded-3xl shadow-2xl shadow-black/80 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Connect Workspace
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginStep(1);
                  setLoginMsg(null);
                }}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-black/40 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('otp');
                  setLoginStep(1);
                  setLoginMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  loginMode === 'otp'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Email OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('key');
                  setLoginMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  loginMode === 'key'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Secret Sync Key
              </button>
            </div>

            {loginMsg && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  loginMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-rose-500/10 text-rose-300'
                }`}
              >
                {loginMsg.type === 'success' ? <Check size={14} /> : <X size={14} />}
                <span>{loginMsg.text}</span>
              </div>
            )}

            {loginMode === 'otp' ? (
              loginStep === 1 ? (
                <form onSubmit={handleSendLoginOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
                      Your Registered Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs bg-black/40 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLoginModal(false)}
                      className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loggingIn}
                      className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all shadow-lg shadow-white/10 disabled:opacity-50 cursor-pointer"
                    >
                      {loggingIn ? 'Sending Code...' : 'Send Login Code'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
                      Enter 6-Digit Code sent to {loginEmail}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2.5 text-center tracking-[8px] font-mono font-bold text-base bg-black/40 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setLoginStep(1)}
                      className="text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                    >
                      Change Email
                    </button>
                    <button
                      type="submit"
                      disabled={loggingIn || loginOtp.length < 6}
                      className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all shadow-lg shadow-white/10 disabled:opacity-50 cursor-pointer"
                    >
                      {loggingIn ? 'Logging In...' : 'Verify & Enter'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form onSubmit={handleLoginByKey} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
                    Secret Sync Key
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="el_gst_... or api_key"
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-black/40 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all font-mono"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all shadow-lg shadow-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    {loggingIn ? 'Connecting...' : 'Connect Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Device Sync QR Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm p-6 bg-[#0c0d12] rounded-3xl shadow-2xl shadow-black/80 space-y-5 animate-scaleUp text-center">
            <div className="flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Sync to Mobile Device
                </h3>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed text-left">
              Scan this QR code with your phone camera to instantly open and manage this exact workspace without typing credentials.
            </p>

            {/* Clean QR Box */}
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  getSyncUrl()
                )}`}
                alt="Device Sync QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            {/* Copy Sync Link Button */}
            <div className="pt-2">
              <button
                onClick={copySyncLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-neutral-200 transition cursor-pointer"
              >
                {copiedSync ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedSync ? 'Copied Sync URL!' : 'Copy Device Sync Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Legal Terms & Privacy Modal */}
      {showLegal && (
        <LegalModal
          initialTab={showLegal}
          onClose={() => setShowLegal(null)}
        />
      )}
    </div>
  );
};

export default App;