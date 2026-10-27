import React, { useState, useEffect, useRef } from 'react';
import { Sheet } from '../Sheet';
import { ChevronLeft } from 'lucide-react';
import { AuthSession } from '../../types';
import { useI18n } from '../../i18n/context';

interface SaveAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSendOtp: (email: string, purpose: 'claim' | 'login') => Promise<{ message: string; dev_code?: string }>;
  onVerifyOtp: (email: string, code: string, purpose: 'claim' | 'login') => Promise<AuthSession>;
  onSuccess: (session: AuthSession) => void;
  onToast: (msg: string) => void;
}

export const SaveAccountSheet: React.FC<SaveAccountSheetProps> = ({
  isOpen,
  onClose,
  onSendOtp,
  onVerifyOtp,
  onSuccess,
  onToast,
}) => {
  const { tx } = useI18n();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setError(null);
      setDevCode(null);
      setOtp(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await onSendOtp(email.trim(), 'claim');
      setStep(2);
      setCountdown(60);
      if (res.dev_code) {
        setDevCode(res.dev_code);
      }
    } catch (err: any) {
      setError(err.message || tx('Gagal mengirim kode verifikasi', 'Could not send verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setError(tx('Masukkan 6 digit kode lengkap', 'Enter the full 6-digit code'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await onVerifyOtp(email.trim(), fullCode, 'claim');
      onSuccess(session);
      onToast(tx('Akun tersimpan', 'Account saved'));
      onClose();
    } catch (err: any) {
      setError(err.message || tx('Kode verifikasi tidak sesuai atau sudah kedaluwarsa', 'Code does not match or has expired'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={tx('Simpan akun', 'Save account')}>
      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--tx2)] leading-normal">
            {tx('Kami kirim kode 6 digit ke email kamu. Tanpa kata sandi.', 'We send a 6-digit code to your email. No password needed.')}
          </p>

          {error && (
            <div className="p-3 rounded-[var(--r2)] bg-rose-500/10 text-rose-400 text-[13px]">
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="s-email">Email</label>
            <input
              id="s-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder={tx('nama@email.com', 'name@email.com')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-p btn-w mt-2 disabled:opacity-50"
          >
            {loading ? tx('Mengirim kode...', 'Sending code...') : tx('Kirim kode', 'Send code')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--tx2)] leading-normal">
            {tx('Masukkan kode yang dikirim ke', 'Enter the code sent to')}{' '}
            <strong className="text-[var(--tx)] font-semibold">{email}</strong>. Berlaku 10 menit.
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

          <div className="otp" aria-label={tx('Kode 6 digit', '6-digit code')}>
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
            {loading ? tx('Memverifikasi...', 'Verifying...') : tx('Konfirmasi', 'Confirm')}
          </button>

          <div className="flex items-center justify-between text-[13px] pt-1">
            <button
              type="button"
              className="btn btn-t btn-sm -ml-2"
              onClick={() => {
                setStep(1);
                setError(null);
              }}
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
              <span>{tx('Ganti email', 'Change email')}</span>
            </button>
            <span className="text-[var(--tx2)]">
              {countdown > 0 ? (
                `Kirim ulang dalam 0:${countdown < 10 ? `0${countdown}` : countdown}`
              ) : (
                <button
                  type="button"
                  className="text-[var(--ac)] hover:underline font-medium"
                  onClick={handleSendOtp}
                >
                  {tx('Kirim ulang kode', 'Resend code')}
                </button>
              )}
            </span>
          </div>
        </form>
      )}
    </Sheet>
  );
};
