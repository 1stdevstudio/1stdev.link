import React from 'react';
import './portfolio-landing.css';

interface LandingPageProps {
  onStart: (goal: 'profile' | 'links') => void;
  onOpenLogin: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
  loading?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onOpenLogin,
  onOpenLegal
}) => {
  return (
    <div className="portfolio-landing">
      {/* 01. HEADER */}
      <header className="header wrap">
        <a href="/" className="logo" aria-label="1stdev.link">
          <span className="brand-name">
            1stdev<span className="domain-suffix">.link</span>
          </span>
          <span className="brand-spark" aria-hidden="true">✳</span>
        </a>

        <nav aria-label="Navigasi utama">
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara Kerja</a>
          <a href="/docs" target="_blank" rel="noopener noreferrer">API</a>
          <button
            type="button"
            className="nav-contact"
            onClick={onOpenLogin}
          >
            <span>Masuk</span>
            <span aria-hidden="true">↗</span>
          </button>
        </nav>
      </header>

      {/* 02. HERO SECTION */}
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot"></span> LINK BIO CERDAS & PEMENDEK TAUTAN
            </p>
            <h1 id="hero-title">
              Satu alamat. <em>Semua dunia Anda.</em>
              <span className="headline-star" aria-hidden="true">✳</span>
            </h1>
            <p className="intro">
              Hubungkan pengunjung, karya, produk, dan media sosial Anda dalam satu tempat yang cepat dan tenang. Sub-15ms di edge global, tanpa pelacak iklan.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => onStart('profile')}
              >
                <span>Mulai Buat Halaman</span>
                <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="hero-secondary"
                onClick={() => onStart('links')}
              >
                <span>Perpendek tautan saja</span>
                <span aria-hidden="true">↗</span>
              </button>
            </div>

            <p className="hero-note">
              <span className="status-dot"></span> 100% Bebas biaya <span>·</span> Langsung aktif tanpa daftar
            </p>
          </div>

          {/* Sisi Kanan: Orbital Sculpture (.space-art persis di portfolio asli) */}
          <div className="space-art" role="img" aria-label="Sculpture orbital mint di ruang hijau gelap">
            <div className="space-grid" aria-hidden="true"></div>
            <div className="space-art-top">
              <span>1STDEV LINK PLATFORM</span>
              <span className="art-coordinate">001 / ∞</span>
            </div>

            <div className="orbital-system" aria-hidden="true">
              <div className="orbit orbit-one"></div>
              <div className="orbit orbit-two"></div>
              <div className="orbit orbit-three"></div>
              <div className="planet"></div>
              <span className="satellite satellite-one"></span>
              <span className="satellite satellite-two"></span>
              <span className="space-cross cross-one">+</span>
              <span className="space-cross cross-two">+</span>
            </div>

            <div className="floating-label" aria-hidden="true">
              <span className="label-dot"></span>
              <span>1STDEV.LINK · SUB-15MS EDGE</span>
            </div>

            <div className="space-art-bottom">
              <span>
                SATU IDENTITAS TERPUSAT.<br />
                <strong>SAMBUNGKAN SEGALANYA.</strong>
              </span>
              <span className="space-seal" aria-hidden="true">✳</span>
            </div>
            <span className="space-word" aria-hidden="true">EDGE</span>
          </div>

          <div className="hero-caption">
            <span>DIBANGUN DI ATAS CLOUDFLARE GLOBAL EDGE</span>
            <span>SUB-15MS RESPONSE TIME ↗</span>
          </div>
        </section>

        {/* 03. DISCIPLINE STRIP */}
        <section className="discipline-strip" aria-label="Prinsip dasar">
          <div className="wrap">
            <span>DESAIN DENGAN MAKSUD</span>
            <span className="strip-star" aria-hidden="true">✳</span>
            <span>DIBANGUN UNTUK MANUSIA</span>
            <span className="strip-star" aria-hidden="true">✳</span>
            <span>RUANG UNTUK BERTUMBUH</span>
            <span className="strip-star" aria-hidden="true">✳</span>
            <span>100% BEBAS BIAYA</span>
          </div>
        </section>

        {/* 04. SECTION PILIHAN KARYA (.link-preview asli dari portfolio) */}
        <section id="fitur" className="section wrap" aria-labelledby="work-title">
          <div className="work-heading">
            <div>
              <p className="eyebrow">01 / KAPABILITAS UTAMA</p>
              <h2 id="work-title">
                Ringkas di luar.<br />
                <em>Kuat di dalam.</em>
              </h2>
            </div>
            <p>
              Dirancang untuk kreator, profesional, dan bisnis mandiri.<br />
              <span>Bio profil modular dengan 14+ blok dan penyingkat URL berkecepatan tinggi.</span>
            </p>
          </div>

          <div className="projects">
            <article className="project">
              <div className="project-art link-preview" aria-hidden="true">
                <span className="project-label">01 / LINK-IN-BIO PLATFORM</span>

                <div className="product-story">
                  <span className="product-brand">
                    1stdev<span className="link-brand-suffix">.link</span>
                  </span>
                  <p>
                    Banyak cerita.<br />
                    <em>Satu tautan.</em>
                  </p>
                  <span className="product-tag">PROFIL ANDA. SEMUA TAUTAN ANDA.</span>
                </div>

                <div className="bio-composition">
                  <span className="bio-orbit orbit-a"></span>
                  <span className="bio-orbit orbit-b"></span>
                  <div className="bio-phone">
                    <div className="phone-camera"></div>
                    <span className="bio-avatar">✳</span>
                    <strong>Ruang untuk ide.</strong>
                    <span className="bio-handle">@1stdev</span>
                    <p>Design. Develop. Go beyond.</p>
                    <div className="bio-link">
                      <span>✳</span> Karya pilihan <span>↗</span>
                    </div>
                    <div className="bio-link">
                      <span>◎</span> Kenali kami <span>↗</span>
                    </div>
                    <div className="bio-link">
                      <span>↗</span> Mari berkolaborasi <span>↗</span>
                    </div>
                    <span className="bio-signature">1stdev.link</span>
                  </div>
                  <span className="bio-float">One link. Your world. ↗</span>
                </div>

                <span className="preview-disclaimer">ILUSTRASI PRODUK</span>
                <span className="view-project">↗</span>
              </div>

              <div className="project-info">
                <h3>1stdev.link</h3>
                <p>PLATFORM LINK-IN-BIO & SHORTLINK</p>
              </div>
              <p className="project-description">
                Platform link-in-bio untuk mengumpulkan berbagai tautan dalam satu halaman profil. Membantu kreator, individu, dan brand membagikan profil serta tautan mereka melalui satu alamat yang mudah dibagikan.
              </p>
              <button
                type="button"
                className="project-website"
                onClick={() => onStart('profile')}
              >
                Mulai gunakan 1stdev.link sekarang <span aria-hidden="true">↗</span>
              </button>
            </article>
          </div>
        </section>

        {/* 05. CARA KAMI BEKERJA */}
        <section id="cara-kerja" className="section wrap" aria-labelledby="process-title">
          <div className="process-heading">
            <p className="eyebrow">02 / ALUR KERJA</p>
            <h2 id="process-title">
              Tanpa hambatan.<br />
              <em>Langsung terbit.</em>
            </h2>
            <p>
              Membagikan karya seharusnya tidak rumit.<br />
              Tiga langkah mudah untuk memiliki ruang digital Anda sendiri.
            </p>
          </div>

          <div className="process-steps">
            <article>
              <div className="step-number">
                01 <span aria-hidden="true">↗</span>
              </div>
              <h3>Pilih Identitas</h3>
              <p>
                Tentukan nama handle profil Anda atau masukkan URL yang ingin Anda perpendek. Tanpa proses registrasi panjang.
              </p>
            </article>

            <article>
              <div className="step-number">
                02 <span aria-hidden="true">↗</span>
              </div>
              <h3>Rangkai Konten</h3>
              <p>
                Susun tautan penting, portofolio, WhatsApp, hingga sosial media Anda dengan tata letak yang bersih dan tenang.
              </p>
            </article>

            <article>
              <div className="step-number">
                03 <span aria-hidden="true">↗</span>
              </div>
              <h3>Bagikan ke Dunia</h3>
              <p>
                Sematkan satu link 1stdev.link di bio Instagram, TikTok, atau kartu nama Anda. Cepat diakses dari belahan dunia mana pun.
              </p>
            </article>
          </div>
        </section>

        {/* 06. CALL TO ACTION / KONTAK */}
        <section className="contact" aria-labelledby="contact-title">
          <div className="wrap contact-inner">
            <p className="eyebrow">
              <span className="status-dot"></span> 03 / LANGKAH BERIKUTNYA
            </p>
            <div className="contact-row">
              <h2 id="contact-title">
                Mulai ruang Anda.<br />
                <em>Gratis selamanya.</em>
              </h2>
              <button
                type="button"
                className="contact-arrow"
                onClick={() => onStart('profile')}
                aria-label="Mulai sekarang"
              >
                ↗
              </button>
            </div>
            <div className="contact-bottom">
              <p>Aktif seketika. Tanpa registrasi panjang, tanpa langganan tersembunyi.</p>
              <button
                type="button"
                onClick={() => onStart('profile')}
              >
                Buat link bio Anda sekarang ↗
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 07. FOOTER WORDMARK & DETAILS */}
      <div className="footer-wordmark wrap" aria-hidden="true">
        1stdev<span>.link</span>
        <span className="footer-star">✳</span>
      </div>

      <footer className="footer wrap">
        <p>© 2026 1stdev.link. Bagian dari 1stdev.space.</p>
        <div className="footer-links">
          <button type="button" onClick={() => onOpenLegal('terms')}>
            Ketentuan Layanan
          </button>
          <span>·</span>
          <button type="button" onClick={() => onOpenLegal('privacy')}>
            Privasi
          </button>
          <span>·</span>
          <a href="/docs" target="_blank" rel="noopener noreferrer">
            Dokumentasi API
          </a>
        </div>
      </footer>
    </div>
  );
};
