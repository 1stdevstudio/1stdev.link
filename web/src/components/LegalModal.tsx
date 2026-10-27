import React, { useState } from 'react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ initialTab = 'terms', onClose }) => {
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0c0d12] rounded-3xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white">
              {tab === 'terms' ? <FileText size={16} /> : <ShieldCheck size={16} />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {tab === 'terms' ? 'Ketentuan Layanan (Terms of Service)' : 'Kebijakan Privasi (Privacy Policy)'}
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                EdgeLink Platform • Berlaku Efektif: 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 flex gap-2 border-b border-white/[0.04]">
          <button
            onClick={() => setTab('terms')}
            className={`pb-2.5 px-3 text-xs font-medium transition-all cursor-pointer relative ${
              tab === 'terms' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Ketentuan Layanan
            {tab === 'terms' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setTab('privacy')}
            className={`pb-2.5 px-3 text-xs font-medium transition-all cursor-pointer relative ${
              tab === 'privacy' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Kebijakan Privasi
            {tab === 'privacy' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Body (Scrollable Legal Content) */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300 leading-relaxed font-sans">
          {tab === 'terms' ? (
            <>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  1. Prinsip Layanan: 100% Gratis & Bebas Iklan
                </h4>
                <p>
                  EdgeLink adalah platform manajemen tautan ringkas (shortlink) dan laman profil digital (bio page) yang disediakan secara <strong>sepenuhnya gratis untuk umum tanpa syarat apapun</strong>. Kami tidak memungut biaya langganan, tidak meminta kartu kredit, dan tidak menyelipkan iklan komersial maupun banner pihak ketiga pada tautan dan laman bio pengguna.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  2. Akses Tanpa Hambatan (Frictionless Access)
                </h4>
                <p>
                  Setiap individu berhak menggunakan platform ini secara langsung sebagai sesi publik atau menautkan surel (email) pribadi untuk penyimpanan permanen. Tidak ada kewajiban verifikasi data rumit atau pengisian formulir marketing.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-rose-400" />
                  3. Batasan Penggunaan & Larangan Konten (Zero Tolerance)
                </h4>
                <p>
                  Untuk menjaga integritas dan keamanan seluruh ekosistem, pengguna dilarang keras membuat tautan ke:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-neutral-400">
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

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-cyan-400" />
                  4. Ketersediaan Layanan & Batasan Tanggung Jawab
                </h4>
                <p>
                  Layanan disediakan atas dasar apa adanya (&quot;as is&quot;). Meskipun kami menerapkan arsitektur berkinerja tinggi dengan uptime maksimal, EdgeLink tidak bertanggung jawab atas kerugian tidak langsung, kegagalan jaringan internet pihak ketiga, atau konten yang diunggah oleh pengguna pihak luar.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  1. Filosofi Privasi: Zero-Tracker & Cookieless
                </h4>
                <p>
                  Kami menghormati hak privasi pengguna dan pengunjung tautan. EdgeLink <strong>tidak menggunakan cookie pelacak pihak ketiga</strong> (third-party tracking cookies), tidak membuat profil periklanan, dan tidak pernah menjual atau membagikan data kepada broker data manapun.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  2. Data yang Dikumpulkan & Tujuannya
                </h4>
                <p>Kami hanya mengumpulkan data minimal yang mutlak dibutuhkan untuk operasional sistem:</p>
                <ul className="list-disc pl-5 space-y-1 text-neutral-400">
                  <li><strong>Informasi Akun:</strong> Alamat email (hanya jika Anda memilih untuk menyimpan workspace secara permanen). Email hanya digunakan untuk otentikasi login satu kali (OTP) dan verifikasi kepemilikan.</li>
                  <li><strong>Statistik Kunjungan:</strong> Penghitungan agregat total klik per hari dan estimasi negara asal (berdasarkan geolokasi jaringan dua digit, misal ID/SG) tanpa mencatat identitas personal pengunjung.</li>
                  <li><strong>Pencegahan Penyalahgunaan:</strong> IP address pengunjung hanya diproses sesaat di memori untuk mitigasi serangan bot dan rate limiting, tidak disimpan permanen dalam database riwayat penjelajahan.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  3. Hak Pengguna & Penghapusan Data (Right to be Forgotten)
                </h4>
                <p>
                  Setiap tautan yang Anda buat dapat diaktifkan, dinonaktifkan, atau dihapus secara permanen seketika melalui tombol hapus pada panel. Jika sebuah tautan dihapus, data target dan catatan analitik yang terkait akan langsung dimusnahkan secara menyeluruh.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  4. Kontak Dukungan & Pelaporan
                </h4>
                <p>
                  Untuk permohonan penghapusan tautan pelanggaran hak cipta atau pelaporan penyalahgunaan (abuse), pengguna dapat mengirimkan permohonan melalui email resmi tim keamanan sistem.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-white/[0.02] border-t border-white/[0.04] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>EdgeLink • 100% Free &amp; Private</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold font-sans transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
