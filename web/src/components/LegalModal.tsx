import React, { useEffect, useRef, useState } from 'react';
import { Mail, MessageCircle, Copy, Check, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { Sheet } from './Sheet';
import { LEGAL_CONTACT, LEGAL_VERSION, legalDocuments, legalHighlights } from '../legal/content';

interface LegalModalProps { initialTab?: 'terms' | 'privacy'; onClose: () => void; }
export const LegalModal: React.FC<LegalModalProps> = ({ initialTab = 'terms', onClose }) => {
  const { tx, lang } = useI18n();
  const [tab, setTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const start = useRef<HTMLDivElement>(null);
  const content = legalDocuments[lang === 'en' ? 'en' : 'id'][tab];
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { start.current?.scrollIntoView({ block: 'start' }); setCopied(false); }, [tab, lang]);
  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('legal', tab);
    try { await navigator.clipboard.writeText(url.toString()); setCopied(true); } catch { /* Clipboard permission may be unavailable. */ }
  };
  return <Sheet isOpen onClose={onClose} title={tab === 'terms' ? tx('Ketentuan Layanan', 'Terms of Service') : tx('Kebijakan Privasi', 'Privacy Policy')}>
    <div ref={start} className="text-xs text-[var(--tx3)]">1stdev.link · {tx('Terakhir diperbarui', 'Last updated')} {LEGAL_VERSION}</div>
    <nav aria-label={tx('Dokumen hukum', 'Legal documents')} className="flex gap-2">
      {(['terms', 'privacy'] as const).map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-[13px] font-medium ${tab === value ? 'bg-[var(--ac)] text-[var(--bg)]' : 'bg-[var(--s2)] text-[var(--tx2)]'}`}>{value === 'terms' ? tx('Ketentuan', 'Terms') : tx('Privasi', 'Privacy')}</button>)}
    </nav>
    <button type="button" onClick={copyLink} className="self-start inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--s2)] px-3 text-[13px] font-semibold text-[var(--tx)]">
      {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? tx('Tautan disalin', 'Link copied') : tx('Salin tautan dokumen', 'Copy document link')}
    </button>
    <article className="text-[13px] leading-7 text-[var(--tx2)] [overflow-wrap:anywhere]">
      <aside className="rounded-2xl bg-[var(--s2)] p-4">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--tx)]"><ShieldCheck size={17} aria-hidden="true" />{tx('Poin penting', 'Key points')}</h3>
        <p className="mt-1 text-xs">{tx('Ringkasan ini bukan pengganti dokumen lengkap di bawah.', 'This summary does not replace the complete document below.')}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">{legalHighlights[lang === 'en' ? 'en' : 'id'][tab].map(point => <li key={point}>{point}</li>)}</ul>
      </aside>
      <p className="rounded-2xl bg-[var(--s2)] p-4">{content.intro}</p>
      <details className="mt-4 rounded-2xl bg-[var(--s2)] px-4 py-2">
        <summary className="cursor-pointer py-2 font-medium text-[var(--tx)]">{tx('Daftar isi', 'Contents')} · {content.sections.length} {tx('bagian', 'sections')}</summary>
        <ol className="list-decimal pl-5">{content.sections.map((section, index) => <li key={section.title}><button type="button" className="min-h-11 py-2 text-left underline underline-offset-4" onClick={() => document.getElementById(`legal-${tab}-${index}`)?.scrollIntoView({ block: 'start' })}>{section.title}</button></li>)}</ol>
      </details>
      {content.sections.map((section, index) => <section id={`legal-${tab}-${index}`} key={section.title} className="mt-6 scroll-mt-4"><h3 className="mb-2 text-[15px] font-semibold text-[var(--tx)]">{index + 1}. {section.title}</h3>{section.paragraphs.map(paragraph => <p key={paragraph} className="mt-2">{paragraph}</p>)}</section>)}
      <aside className="mt-6 rounded-2xl bg-[var(--s2)] p-4"><h3 className="font-semibold text-[var(--tx)]">{tx('Kontak dan permintaan data', 'Contact and data requests')}</h3><p className="mt-1">{tx('Untuk akses, koreksi, penghapusan, atau laporan keamanan. Jangan kirim OTP maupun kunci API.', 'For access, correction, deletion, or security reports. Do not send OTPs or API keys.')}</p>
        <a className="flex min-h-11 items-center gap-2 text-[var(--ac)] underline" href={`mailto:${LEGAL_CONTACT.support}`}><Mail size={16} strokeWidth={1.75} />{LEGAL_CONTACT.support}</a>
        <a className="flex min-h-11 items-center gap-2 text-[var(--ac)] underline" href={`https://wa.me/${LEGAL_CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} strokeWidth={1.75} />+62 851-5796-5588</a>
        <a className="inline-block min-h-11 py-2 underline" href={`mailto:${LEGAL_CONTACT.general}`}>{LEGAL_CONTACT.general}</a>
      </aside>
      <p className="mt-5 text-xs text-[var(--tx3)]">{tx('Rujukan dan kebijakan penyedia:', 'References and provider policies:')} <a className="underline" href="https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%20nomor%2027%20tahun%202022" target="_blank" rel="noopener noreferrer">UU PDP</a> · <a className="underline" href="https://jdih.kemenkeu.go.id/api/download/fulltext/1999/8TAHUN~1999UU.htm" target="_blank" rel="noopener noreferrer">UU Perlindungan Konsumen</a> · <a className="underline" href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare</a> · <a className="underline" href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend</a></p>
    </article>
    <button type="button" onClick={onClose} className="btn btn-p mt-3">{tx('Tutup', 'Close')}</button>
  </Sheet>;
};
