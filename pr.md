# PR Rencana Lanjutan DriverSheet.com

## Ringkasan Saat Ini
- **Backend Rust (Axum + sqlx)** sudah menangani upsert user, list logs, webhook Lemon, serta mail server parsing PDF dan append ke Google Sheet.
- **Frontend Next.js 13** memiliki landing page, halaman auth dengan Google sign-in, dan dashboard dasar menampilkan forward address, status trial, dan tabel logs.
- Tooling dasar tersedia (`cargo check`, `npm run lint` bersih). Dependensi frontend sudah terinstal.

## Target Berikutnya
1. **Penyelesaian Alur Auth & Onboarding**
   - Tambahkan form Sheet URL di `/auth` setelah login sukses, ekstrak `sheetId`, panggil `POST /api/users` untuk menyimpan.
   - Tampilkan error/validasi jika Sheet URL tidak valid.
   - Pertimbangkan step onboarding ringan di dashboard bila user belum memasukkan Sheet.

2. **Fitur Dashboard**
   - Tombol "Download CSV" (opsi: endpoint Rust atau route Next.js `/api/download`).
   - Penanganan state loading/error saat fetch logs.
   - Banner/pesan ketika Lemon webhook mengubah status `paid=true` atau trial mendekati habis.
   - Opsional: auto-refresh tabel setelah email baru masuk (polling ringan atau SSE kelak).

3. **API Proxy di Next.js (Opsional sesuai brief)**
   - Rute `/api/register`, `/api/logs`, `/api/download` untuk mem-proxy request ke backend Axum dengan session token.
   - Pastikan proteksi auth dan sanitasi input di layer frontend.

4. **Dokumentasi & Deployment**
   - Buat `Dockerfile` single stage (Rust binary + Next.js static export dengan nginx).
   - Susun `docker-compose.yml` produksi (port 25/80/443, volume `./data`).
   - Tambahkan `README.md` berisi: setup env, cara run lokal, cara deploy ke VPS, command testing.
   - Contoh unit `systemd` dan snippet Nginx/Caddy (redirect 80→443, pass mail port).
   - Markdown 1 halaman tentang pembuatan Google Service Account dan cara share Sheet.

5. **Quality Gate & CI**
   - Lengkapi `cargo fmt`, `cargo clippy`, dan `cargo test` (bila ada) ke workflow nanti.
   - Atasi peringatan TypeScript 5.4.5 vs @typescript-eslint (turunkan versi TS atau upgrade tooling).

6. **Housekeeping / UX**
   - Komponen pengaturan untuk mengganti Sheet ID.
   - Konfirmasi email sukses diterima (log atau notifikasi).
   - Tambahkan state kosong + skeleton UI.
   - Logging terstruktur untuk PDF parsing gagal.

## Langkah Eksekusi Disarankan
1. Selesaikan form Sheet URL + API proxy (±0.5 hari).
2. Implementasi CSV export + perbaikan dashboard UX (±0.5 hari).
3. Produksi dokumen deployment + infra assets (±0.5 hari).
4. Review keseluruhan, jalankan tes (`cargo check`, `npm run lint`), dan siap PR.

## Catatan Risiko
- Google Sheets API memerlukan kredensial valid; perlu testing manual dengan sample Sheet.
- SMTP parsing bergantung pada format PDF—siapkan fallback logging bila regex tidak match.
- Deploy container butuh port 25 yang biasanya diblokir penyedia VPS; siapkan plan B (relay atau alternate port) jika diperlukan.

## Checklist Sebelum Merge
- [ ] Form Sheet URL dan API proxy selesai.
- [ ] CSV export tersedia dan teruji.
- [ ] Dokumentasi deployment lengkap.
- [ ] Docker build dan runtime dicoba minimal sekali.
- [ ] Semua lint/test (`cargo check`, `npm run lint`) hijau.
