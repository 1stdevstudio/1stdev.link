# Dropdown redesign — 30 Oktober 2026

Implementasi lokal, belum deploy/commit. Hermes ag/gemini-3.8-flash-high membuat komponen Select dan mengganti 10 dropdown di LinksScreen, BusinessModePanel, BusinessBlockSheet. Codex memeriksa hasil serta memperbaiki shadow dekoratif, ukuran opsi44px, pemanggilan onChange ganda, dan label pengurutan yang terlalu sempit pada ponsel.

Komponen: web/src/components/Select.tsx. Menu portal fixed, penyesuaian posisi viewport, status dipilih/disabled, keyboard Arrow/Home/End/Enter/Space/Escape/Tab, hidden select menjaga nilai form. CSS memakai surface hijau/gold tanpa border/shadow dekoratif. Indikator fokus tetap terlihat.

Verifikasi: native Worker typecheck dan92/92tes lulus; build web lulus. Browser lokal memverifikasi dropdown pengurutan, perubahan nilai lewat End+Enter, Escape, serta tampilan390px. Belum diuji seluruh matriks Safari/iOS atau semua kombinasi field dalam modal.

Bukti: release-evidence/dropdown-mobile.png. Tampilan produksi masih rilis sebelumnya.

## Deploy
Sudah deploy ke produksi: https://a7693285.edgelink-afl.pages.dev dan https://1stdev.link. Aset JS/CSS live cocok SHA-256 dengan build. Dropdown katalog dalam modal berhasil dibuka di produksi; Escape menutup dropdown tanpa menutup modal. Tidak menyimpan perubahan profil/katalog saat verifikasi. Bukti: release-evidence/dropdown-live.png. Git belum commit/push.
