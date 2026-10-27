import React, { useState } from 'react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ initialTab = 'terms', onClose }) => {
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#11131a] rounded-[var(--r3)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--r2)] bg-[var(--s2)] flex items-center justify-center text-[var(--tx)]">
              {tab === 'terms' ? <FileText size={16} strokeWidth={1.75} /> : <ShieldCheck size={16} strokeWidth={1.75} />}
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">
                {tab === 'terms' ? 'Ketentuan Layanan' : 'Kebijakan Privasi'}
              </h3>
              <p className="text-[12px] text-[var(--tx3)] font-mono">
                EdgeLink by 1stnear.com • 100% Gratis &amp; Bebas Iklan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="iconbtn"
            aria-label="Tutup"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`pb-2 px-3 text-[13px] font-medium transition cursor-pointer relative ${
              tab === 'terms' ? 'text-[var(--tx)]' : 'text-[var(--tx3)] hover:text-[var(--tx2)]'
            }`}
          >
            Ketentuan Layanan
            {tab === 'terms' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ac)] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('privacy')}
            className={`pb-2 px-3 text-[13px] font-medium transition cursor-pointer relative ${
              tab === 'privacy' ? 'text-[var(--tx)]' : 'text-[var(--tx3)] hover:text-[var(--tx2)]'
            }`}
          >
            Kebijakan Privasi
            {tab === 'privacy' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ac)] rounded-full" />
            )}
          </button>
        </div>

        {/* Body (Scrollable Legal Content) */}
        <div className="p-5 overflow-y-auto space-y-5 text-[13px] text-[var(--tx2)] leading-relaxed">
          {tab === 'terms' ? (
            <>
              <section className="space-y-1.5">
                <h4 className="text-[14px] font-semibold text-[var(--tx)] flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[var(--ok)]" />
                  1. Prinsip Layanan: 100% Gratis & Bebas Iklan
                </h4>
                <p>
                  EdgeLink by 1stnear.com adalah platform manajemen tautan ringkas (shortlink) dan laman profil digital (bio page) yang disediakan secara <strong>sepenuhnya gratis untuk umum tanpa syarat apapun</strong>. Kami tidak memungut biaya langganan, tidak meminta kartu kredit, dan tidak menyelipkan iklan komersial maupun banner pihak ketiga pada tautan dan laman bio pengguna.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-[14px] font-semibold text-[var(--tx)] flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[var(--ok)]" />
                  2. Akses Tanpa Hambatan (Frictionless Access)
                </h4>
                <p>
                  Setiap individu berhak menggunakan platform ini secara langsung sebagai sesi publik atau menautkan surel (email) pribadi untuk penyimpanan permanen. Tidak ada kewajiban verifikasi data rumit atau pengisian formulir marketing.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-[14px] font-semibold text-[var(--tx)] flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-rose-400" />
                  3. Batasan Penggunaan & Larangan Konten (Zero Tolerance)
                </h4>
                <p>
                  Untuk menjaga integritas dan keamanan seluruh ekosistem, pengguna dilarang keras membuat tautan ke:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--tx3)]">
                  <li>Upaya phishing, penipuan finansial, atau pemalsuan identitas instansi.</li>
                  <li>Penyebaran perangkat lunak berbahaya (malware, ransomware, virus, spyware).</li>
                  <li>Konten eksploitasi anak, pornografi ilegal, atau kekerasan ekstrem.</li>
                  <li>Perjudian ilegal, peredaran zat terlarang, atau pelanggaran hak kekayaan intelektual (pembajakan).</li>
                  <li>Spam massal, botnet, atau penyerangan Denial of Service (DoS/DDoS).</li>
                </ul>
                <p>
                  Tautan yang melanggar ketentuan ini akan <strong>diblokir secara permanen seketika</strong> tanpa pemberitahuan sebelumnya.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-[14px] font-semibold text-[var(--tx)] flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[var(--ac)]" />
                  4. Ketersediaan Layanan & Batasan Tanggung Jawab
                </h4>
                <p>
                  Layanan disediakan atas dasar apa adanya (&quot;as is&quot;). Meskipun kami menerapkan arsitektur berkinerja tinggi dengan uptime maksimal, EdgeLink tidak bertanggung jawab atas kerugian tidak langsung, kegagalan jaringan internet pihak ketiga, atau konten yang diunggah oleh pengguna pihak luar.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1.5">
                <h4 className="text-[14px] font-semibold text-[var(--tx)] flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[var(--ok)]" />
                  1. Filosofi Privasi: Zero-Tracker & Cookieless
                </h4>
                <p>
                  Kami menghormati hak privasi pengguna dan pengunjung tautan. EdgeLink <strong>tidak menggunakan cookie pelacak pihak ketiga</strong> (third-party tracking cookies), tidak membuat profil periklanan, dan tidak pernah menjual atau membagikan data kepada broker data manapun.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-[14px] font-semibold text-[var(--tx)] flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[var(--ok)]" />
                  2. Data yang Dikumpulkan & Tujuannya
                </h4>
                <p>Kami hanya mengumpulkan data minimal yang mutlak dibutuhkan untuk operasional sistem:</p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--tx3)]">
                  <li><strong>Informasi Akun:</strong> Alamat email (hanya jika Anda memilih untuk menyimpan workspace secara permanen). Email hanya digunakan untuk otentikasi login satu kali (OTP) dan verifikasi kepemilikan.</li>
                  <li><strong>Statistik Kunjungan:</strong> Penghitungan agregat total klik per hari dan estimasi negara asal (berdasarkan geolokasi jaringan dua digit, misal ID/SG) tanpa mencatat identitas personal pengunjung.</li>
                  <li><strong>Pencegahan Penyalahgunaan:</strong> IP address pengunjung hanya diproses sesaat di memori untuk mitigasi serangan bot dan rate limiting, tidak disimpan permanen dalam database riwayat penjelajahan.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-[14px] font-semibold text-[var(--tx)] flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[var(--ok)]" />
                  3. Hak Pengguna & Penghapusan Data (Right to be Forgotten)
                </h4>
                <p>
                  Setiap tautan yang Anda buat dapat diaktifkan, dinonaktifkan, atau dihapus secara permanen seketika melalui tombol hapus pada panel. Jika sebuah tautan dihapus, data target dan catatan analitik yang terkait akan langsung dimusnahkan secara menyeluruh.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-5 bg-[var(--s1)] flex items-center justify-between text-[12px] text-[var(--tx3)]">
          <span className="mono">EdgeLink by 1stnear.com • 100% Free &amp; Private</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-p btn-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
