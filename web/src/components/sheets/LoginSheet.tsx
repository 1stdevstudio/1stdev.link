import React, { useState, useRef, useEffect } from 'react';
import { Sheet } from '../Sheet';
import { QrCode, ChevronLeft } from 'lucide-react';
import { AuthSession } from '../../types';

interface LoginSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSendOtp: (email: string, purpose: 'claim' | 'login') => Promise<{ message: string; dev_code?: string }>;
  onVerifyOtp: (email: string, code: string, purpose: 'claim' | 'login') => Promise<AuthSession>;
  onLoginWithKey: (key: string) => Promise<AuthSession>;
  onSuccess: (session: AuthSession) => void;
  onToast: (msg: string) => void;
  onOpenQrScanner?: () => void;
}

export const LoginSheet: React.FC<LoginSheetProps> = ({
  isOpen,
  onClose,
  onSendOtp,
  onVerifyOtp,
  onLoginWithKey,
  onSuccess,
  onToast,
  onOpenQrScanner,
}) => {
  const [mode, setMode] = useState<'email' | 'otp' | 'key'>('email');
  const [email, setEmail] = useState('');
  const [key, setKey] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setMode('email');
      setError(null);
      setDevCode(null);
      setOtp(['', '', '', '', '', '']);
      setKey('');
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (mode === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mode, countdown]);

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await onSendOtp(email.trim(), 'login');
      setMode('otp');
      setCountdown(60);
      if (res.dev_code) {
        setDevCode(res.dev_code);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim kode ke email ini');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setError('Masukkan 6 digit kode lengkap');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await onVerifyOtp(email.trim(), fullCode, 'login');
      onSuccess(session);
      onToast('Berhasil masuk');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kode verifikasi tidak sesuai');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const session = await onLoginWithKey(key.trim());
      onSuccess(session);
      onToast('Berhasil masuk');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kode pindah perangkat tidak valid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Masuk">
      {mode === 'email' && (
        <form onSubmit={handleSendEmailOtp} className="flex flex-col gap-3">
          {error && (
            <div className="p-3 rounded-[var(--r2)] bg-rose-500/10 text-rose-400 text-[13px]">
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="l-email">Email</label>
            <input
              id="l-email"
              type="email"
              inputMode="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-p btn-w mt-1 disabled:opacity-50"
          >
            {loading ? 'Mengirim kode...' : 'Kirim kode'}
          </button>

          <div className="flex items-center gap-2 text-[13px] text-[var(--tx2)] my-2">
            <span className="grow h-px bg-[var(--s2)]" />
            <span>atau</span>
            <span className="grow h-px bg-[var(--s2)]" />
          </div>

          <button
            type="button"
            className="btn btn-g btn-w"
            onClick={() => {
              if (onOpenQrScanner) {
                onOpenQrScanner();
              } else {
                setMode('key');
              }
            }}
          >
            <QrCode size={18} strokeWidth={1.75} />
            <span>Scan QR dari perangkat lama</span>
          </button>

          <button
            type="button"
            className="btn btn-t btn-w btn-sm"
            onClick={() => setMode('key')}
          >
            Pakai kode pindah perangkat
          </button>
        </form>
      )}

      {mode === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--tx2)] leading-normal">
            Masukkan kode 6 digit yang dikirim ke{' '}
            <strong className="text-[var(--tx)] font-semibold">{email}</strong>.
          </p>

          {devCode && (
            <div className="p-2.5 rounded-[var(--r2)] bg-[rgba(233,190,84,0.12)] text-[var(--ac)] text-[12px] font-mono">
              Sandbox Code: {devCode}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-[var(--r2)] bg-rose-500/10 text-rose-400 text-[13px]">
              {error}
            </div>
          )}

          <div className="otp" aria-label="Kode 6 digit">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (otpInputsRef.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                onPaste={idx === 0 ? handleOtpPaste : undefined}
                className="text-center text-[20px] font-semibold h-[52px] p-0"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="btn btn-p btn-w mt-1 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Konfirmasi Masuk'}
          </button>

          <div className="flex items-center justify-between text-[13px] pt-1">
            <button
              type="button"
              className="btn btn-t btn-sm -ml-2"
              onClick={() => {
                setMode('email');
                setError(null);
              }}
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
              <span>Ganti email</span>
            </button>
            <span className="text-[var(--tx2)]">
              {countdown > 0 ? (
                `Kirim ulang dalam 0:${countdown < 10 ? `0${countdown}` : countdown}`
              ) : (
                <button
                  type="button"
                  className="text-[var(--ac)] hover:underline font-medium"
                  onClick={handleSendEmailOtp}
                >
                  Kirim ulang kode
                </button>
              )}
            </span>
          </div>
        </form>
      )}

      {mode === 'key' && (
        <form onSubmit={handleLoginKey} className="flex flex-col gap-3">
          <button
            type="button"
            className="btn btn-t btn-sm self-start -ml-2"
            onClick={() => setMode('email')}
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            <span>Kembali ke email</span>
          </button>

          <p className="text-[13px] text-[var(--tx2)] leading-normal">
            Masukkan kode rahasia pindah perangkat (Access Key) dari panel akun lama kamu.
          </p>

          {error && (
            <div className="p-3 rounded-[var(--r2)] bg-rose-500/10 text-rose-400 text-[13px]">
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="l-key">Kode Pindah Perangkat</label>
            <input
              id="l-key"
              type="text"
              required
              className="mono"
              placeholder="el_gst_... atau el_usr_..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-p btn-w mt-2 disabled:opacity-50"
          >
            {loading ? 'Menghubungkan...' : 'Hubungkan Akun'}
          </button>
        </form>
      )}
    </Sheet>
  );
};
