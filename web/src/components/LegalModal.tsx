import React, { useEffect, useRef, useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { Sheet } from './Sheet';
import { LEGAL_CONTACT, LEGAL_VERSION, legalDocuments } from '../legal/content';

interface LegalModalProps { initialTab?: 'terms' | 'privacy'; onClose: () => void; }
export const LegalModal: React.FC<LegalModalProps> = ({ initialTab = 'terms', onClose }) => {
  const { tx, lang } = useI18n();
  const [tab, setTab] = useState(initialTab);
  const start = useRef<HTMLDivElement>(null);
  const content = legalDocuments[lang === 'en' ? 'en' : 'id'][tab];
  useEffect(() => { start.current?.scrollIntoView({ block: 'start' }); }, [tab, lang]);
  return <Sheet isOpen onClose={onClose} title={tab === 'terms' ? tx('Ketentuan Layanan', 'Terms of Service') : tx('Kebijakan Privasi', 'Privacy Policy')}>
    <div ref={start} className="text-xs text-[var(--tx3)]">1stdev.link · {tx('Diperbarui 30 Oktober 2026', 'Updated October 30, 2026')} · {LEGAL_VERSION}</div>
    <nav aria-label={tx('Dokumen hukum', 'Legal documents')} className="flex gap-2">
      {(['terms', 'privacy'] as const).map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-[13px] font-medium ${tab === value ? 'bg-[var(--ac)] text-[var(--bg)]' : 'bg-[var(--s2)] text-[var(--tx2)]'}`}>{value === 'terms' ? tx('Ketentuan', 'Terms') : tx('Privasi', 'Privacy')}</button>)}
    </nav>
    <article className="text-[13px] leading-7 text-[var(--tx2)] [overflow-wrap:anywhere]">
      <p className="rounded-2xl bg-[var(--s2)] p-4">{content.intro}</p>
      <details className="mt-4 rounded-2xl bg-[var(--s2)] px-4 py-2">
        <summary className="cursor-pointer py-2 font-medium text-[var(--tx)]">{tx('Daftar isi', 'Contents')} · {content.sections.length} {tx('bagian', 'sections')}</summary>
        <ol className="list-decimal pl-5">{content.sections.map((section, index) => <li key={section.title}><button type="button" className="min-h-11 py-2 text-left underline underline-offset-4" onClick={() => document.getElementById(`legal-${tab}-${index}`)?.scrollIntoView({ block: 'start' })}>{section.title}</button></li>)}</ol>
      </details>
      {content.sections.map((section, index) => <section id={`legal-${tab}-${index}`} key={section.title} className="mt-6 scroll-mt-4"><h3 className="mb-2 text-[15px] font-semibold text-[var(--tx)]">{index + 1}. {section.title}</h3>{section.paragraphs.map(paragraph => <p key={paragraph} className="mt-2">{paragraph}</p>)}</section>)}
      <aside className="mt-6 rounded-2xl bg-[var(--s2)] p-4"><h3 className="font-semibold text-[var(--tx)]">{tx('Hubungi pengelola', 'Contact the operator')}</h3>
        <a className="flex min-h-11 items-center gap-2 text-[var(--ac)] underline" href={`mailto:${LEGAL_CONTACT.support}`}><Mail size={16} strokeWidth={1.75} />{LEGAL_CONTACT.support}</a>
        <a className="flex min-h-11 items-center gap-2 text-[var(--ac)] underline" href={`https://wa.me/${LEGAL_CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} strokeWidth={1.75} />+62 851-5796-5588</a>
        <a className="inline-block min-h-11 py-2 underline" href={`mailto:${LEGAL_CONTACT.general}`}>{LEGAL_CONTACT.general}</a>
      </aside>
      <p className="mt-5 text-xs text-[var(--tx3)]">{tx('Rujukan dan kebijakan penyedia:', 'References and provider policies:')} <a className="underline" href="https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%20nomor%2027%20tahun%202022" target="_blank" rel="noopener noreferrer">UU PDP</a> · <a className="underline" href="https://jdih.kemenkeu.go.id/api/download/fulltext/1999/8TAHUN~1999UU.htm" target="_blank" rel="noopener noreferrer">UU Perlindungan Konsumen</a> · <a className="underline" href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare</a> · <a className="underline" href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend</a></p>
    </article>
    <button type="button" onClick={onClose} className="btn btn-p mt-3">{tx('Tutup', 'Close')}</button>
  </Sheet>;
};
