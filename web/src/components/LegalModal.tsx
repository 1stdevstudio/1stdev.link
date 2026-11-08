import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, FileText, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { Sheet } from './Sheet';
import { LEGAL_CONTACT, LEGAL_VERSION, legalDocuments, legalHighlights } from '../legal/content';

interface LegalModalProps {
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
}

/** Shared policy reader inside the app; full SEO pages use the same source text. */
export const LegalModal: React.FC<LegalModalProps> = ({ initialTab = 'terms', onClose }) => {
  const { tx, lang } = useI18n();
  const language = lang === 'en' ? 'en' : 'id';
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);
  const [copied, setCopied] = useState(false);
  const start = useRef<HTMLDivElement>(null);
  const content = legalDocuments[language][tab];
  const points = legalHighlights[language][tab];
  const privacy = tab === 'privacy';

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => {
    setCopied(false);
    const sheet = start.current?.closest('.sheet');
    if (sheet) sheet.scrollTop = 0;
  }, [tab, language]);

  const selectDocument = (value: 'terms' | 'privacy') => {
    const url = new URL(window.location.href);
    url.searchParams.set('legal', value);
    window.history.replaceState(null, '', url);
    setTab(value);
  };
  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('legal', tab);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch { /* Clipboard permission can be unavailable. */ }
  };
  const jumpTo = (index: number) => {
    const node = document.getElementById(`legal-${tab}-${index}`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Sheet isOpen onClose={onClose} className="legal-sheet" title={privacy ? tx('Kebijakan Privasi', 'Privacy Policy') : tx('Ketentuan Layanan', 'Terms of Service')}>
      <div className="legal-modal" ref={start}>
        <div className="legal-meta">
          <span className="legal-meta-label"><i aria-hidden="true" /> 1STDEV.LINK / {tx('INFORMASI & KEBIJAKAN', 'INFORMATION & POLICIES')}</span>
          <span>{tx('Diperbarui', 'Updated')} {LEGAL_VERSION} · {content.sections.length} {tx('bagian', 'sections')}</span>
        </div>
        <div className="legal-tab-row">
          <nav className="legal-tabs" aria-label={tx('Dokumen hukum', 'Legal documents')}>
            {(['terms', 'privacy'] as const).map(value => (
              <button key={value} type="button" aria-pressed={tab === value} onClick={() => selectDocument(value)}>
                {value === 'terms' ? tx('Ketentuan', 'Terms') : tx('Privasi', 'Privacy')}
              </button>
            ))}
          </nav>
          <div className="legal-actions">
            <button type="button" onClick={copyLink} aria-label={tx('Salin tautan dokumen', 'Copy document link')}>
              {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              {copied ? tx('Tersalin', 'Copied') : tx('Salin tautan', 'Copy link')}
            </button>
            <a href={`/${tab}${language === 'en' ? '?lang=en' : ''}`} target="_blank" rel="noopener noreferrer">
              <FileText size={15} aria-hidden="true" />{tx('Halaman penuh', 'Full page')}<ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>

        <header className="legal-hero">
          <p className="legal-hero-kicker">{privacy ? tx('PERLINDUNGAN INFORMASI', 'INFORMATION PROTECTION') : tx('PANDUAN PENGGUNAAN', 'USAGE GUIDELINES')}</p>
          <h3>{privacy ? tx('Privasi Anda. Prioritas Kami.', 'Your Privacy. Our Priority.') : tx('Aturan Jelas. Ruang Berkarya.', 'Clear Terms. Room to Create.')}</h3>
          <p>{content.intro}</p>
          <p className="legal-hero-muted">{tx('Ditulis agar mudah dipahami. Tidak menggantikan dokumen lengkap.', 'Written for clarity. The complete document remains applicable.')}</p>
        </header>

        <section className="legal-summary" aria-labelledby="legal-summary-title">
          <h3 id="legal-summary-title"><ShieldCheck size={19} color="#18765d" aria-hidden="true" />{tx('Poin penting', 'Key points')}</h3>
          <p>{tx('Ringkasan informasi utama sebelum membaca seluruh bagian.', 'A quick overview before reading all sections.')}</p>
          <ol className="legal-summary-grid">{points.map((point, index) => <li key={point}><span>{String(index + 1).padStart(2, '0')} / 04</span>{point}</li>)}</ol>
        </section>

        <div className="legal-content-grid">
          <aside className="legal-toc" aria-label={tx('Daftar isi', 'Contents')}>
            <h4>{tx('DI HALAMAN INI', 'ON THIS PAGE')}</h4>
            <nav aria-label={tx('Daftar bagian', 'Section navigation')}>
              {content.sections.map((section, index) => (
                <button key={section.title} type="button" onClick={() => jumpTo(index)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>{section.title}
                </button>
              ))}
            </nav>
          </aside>
          <div className="legal-article">
            <details className="legal-mobile-toc">
              <summary>{tx('Daftar isi · Pilih bagian', 'Contents · Jump to section')}</summary>
              <ol>{content.sections.map((section, index) => <li key={section.title}><button type="button" onClick={() => jumpTo(index)}>{section.title}</button></li>)}</ol>
            </details>
            <article aria-label={privacy ? tx('Kebijakan Privasi lengkap', 'Full Privacy Policy') : tx('Ketentuan Layanan lengkap', 'Full Terms of Service')}>
              {content.sections.map((section, index) => (
                <section className="legal-section" id={`legal-${tab}-${index}`} key={section.title} aria-labelledby={`legal-heading-${tab}-${index}`}>
                  <span className="legal-count" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <h3 id={`legal-heading-${tab}-${index}`}>{section.title}</h3>
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </article>
          </div>
        </div>

        <section className="legal-contact" aria-labelledby="legal-contact-title">
          <div>
            <h3 id="legal-contact-title">{tx('Butuh bantuan terkait data atau akun?', 'Need help with data or your account?')}</h3>
            <p>{tx('Untuk akses, koreksi, penghapusan, atau laporan keamanan. Jangan pernah mengirim OTP maupun kunci API.', 'For access, correction, deletion, or security reports. Never send OTPs or API keys.')}</p>
          </div>
          <div className="legal-contact-links">
            <a href={`mailto:${LEGAL_CONTACT.support}`}><Mail size={15} aria-hidden="true" />{tx('Email dukungan', 'Email support')}</a>
            <a href={`https://wa.me/${LEGAL_CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden="true" />WhatsApp</a>
          </div>
        </section>

        <p className="legal-references">{tx('Rujukan dan penyedia:', 'References and providers:')}{' '}
          <a href="https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%20nomor%2027%20tahun%202022" target="_blank" rel="noopener noreferrer">UU PDP</a> ·{' '}
          <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare</a> ·{' '}
          <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend</a> ·{' '}
          <a href={`mailto:${LEGAL_CONTACT.general}`}>{LEGAL_CONTACT.general}</a>
        </p>
        <button type="button" onClick={onClose} className="btn btn-p self-end">{tx('Tutup', 'Close')}</button>
      </div>
    </Sheet>
  );
};
