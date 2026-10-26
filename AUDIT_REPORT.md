# Amanah.id — Laporan Perbaikan Login, API, dan UX

## Ringkasan

Perbaikan mempertahankan identitas visual yang ada: sidebar, panel putih, tombol biru, kartu, tipografi, dan token CSS. Fokusnya adalah memperbaiki alur login dan pendaftaran yang rusak, bukan mengganti desain secara menyeluruh.

**Build check:** lulus. **Unit test:** 13 lulus, 0 gagal. Pemeriksaan statis menemukan 190 ID HTML unik, tanpa ID duplikat, selector statis JavaScript yang hilang, atau kunci terjemahan `data-i18n` yang tidak tersedia.

Tes lokal memakai mock API/Supabase. Ini bukan bukti bahwa konfigurasi Vercel atau database live sudah berhasil.

## Perubahan per file

### `public/index.html`
- Form signup umum di modal autentikasi dihapus; pengguna umum hanya melihat login, dengan akses Admin terpisah.
- Form pendaftaran Siswa pada dashboard Guru dilengkapi input email dan password yang sebelumnya dipakai JavaScript tetapi tidak tersedia di DOM.
- Dashboard Admin dilengkapi karena router JavaScript merujuk ke `#dashboard-admin`, tetapi markup dan kontrol Admin sebelumnya hilang.
- Panel Admin memakai kelas dan token gaya yang sudah ada, serta label yang cocok dengan bahasa Indonesia, Inggris, dan Arab.
- Progress bar sampel wajah memiliki atribut aksesibilitas yang diperbarui.

### `public/script.js`
- Pesan HTTP 405 sekarang menyertakan kode status dan petunjuk routing Vercel saat fungsi API tidak ter-deploy.
- Event handler signup umum yang tidak membuat akun sungguhan dihapus.
- Formulir Admin hanya mengirim role Guru, tanpa lagi merujuk ke elemen Admin yang tidak ada di HTML.
- Token Admin memakai `amanahid.adminToken` dan header `X-Admin-Token`; tidak memakai token Guru/Siswa sebagai fallback.
- Judul halaman Admin dan teks status/aksi menyesuaikan bahasa aktif.
- Pemeriksaan statis menunjukkan semua selector ID JavaScript memiliki elemen HTML yang sesuai.

### `api/admin/users.js`
- Admin hanya dapat membuat akun Guru. Akun Siswa harus dibuat Guru melalui `POST /api/students`, yang memvalidasi NISN, password awal, dan descriptor wajah.
- Pembuatan akun Siswa tanpa sampel wajah yang valid dihilangkan.
- Admin tetap bisa melihat dan mengelola akun Guru/Siswa melalui endpoint yang tersedia.

### `api/health.js`
- Endpoint diagnostik baru: GET dan HEAD didukung. GET seharusnya mengembalikan HTTP 200 JSON, `ok: true`, dan nama service tanpa mengungkap secrets.
- Metode yang tidak didukung mendapat respons HTTP 405 terstruktur dan header Allow.

### `vercel.json`, `package.json`, dan `package-lock.json`
- Ditambahkan konfigurasi fungsi Vercel dengan pola glob dan batas durasi yang wajar.
- Package menggunakan ESM dan menargetkan Node.js 24; lockfile konsisten dengan dependensi bcryptjs 3.0.3.
- Jangan mengubah runtime menjadi Node.js 20. Fungsi Vercel mengikuti konfigurasi glob, dan ESM didukung; root deploy harus benar-benar mencakup folder `api/`. 【turn126697search1】【turn126697search6】

### `supabase-demo-admin.sql`
- Skrip seed akun demo Admin disediakan terpisah. Jalankan hanya di staging/demo, bukan produksi, sebab kredensial demo ditampilkan secara publik sesuai kebutuhan proyek.

### `scripts/build-check.js`, `tests/security.test.js`, dan `README.md`
- Build check memvalidasi sintaks API, struktur route, konfigurasi Vercel, dan kebutuhan markup.
- 13 unit test meliputi health endpoint, pembatasan role Admin, login Guru/Siswa terhadap tabel yang benar, serta penanganan nilai kosong/error.
- README memiliki petunjuk troubleshooting HTTP 405, variabel environment, urutan deploy, serta kebijakan pembuatan akun.

## Langkah deployment yang wajib diperiksa

1. Di Vercel Settings → General → Root Directory, pilih folder proyek yang berisi `package.json`, `vercel.json`, dan `api/`. Jangan pilih folder `public/`. Vercel mengandalkan direktori API di root proyek yang dideploy. 【turn126697search1】
2. Redeploy dan buka `https://DOMAIN-DEPLOYMENT/api/health`. Respons yang diharapkan adalah HTTP 200 JSON. Bila 404, 405 non-JSON, atau HTML statis, perbaiki root/deployment sebelum mendiagnosis password.
3. Atur `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SESSION_SECRET` (secret acak yang kuat, minimal 32 karakter), dan `APP_ORIGIN` yang sama persis dengan origin HTTPS deployment. `FONNTE_TOKEN` hanya diperlukan untuk WhatsApp. Jangan masukkan secrets ke HTML.
4. Jalankan `supabase-schema.sql` pada proyek Supabase yang benar dan pastikan kolom/tabel cocok. Untuk akun Admin demo, gunakan `supabase-demo-admin.sql` hanya pada staging.
5. Setelah health check lulus, uji login Admin/Guru/Siswa, pembuatan Siswa oleh Guru dengan sampel wajah, kamera/GPS, CSV, Leaflet, WhatsApp, dark mode, dan bahasa ID/EN/AR di staging.

## Batasan verifikasi

- Build check dan 13 unit test lulus secara lokal; tes login memakai mock sehingga tidak mengonfirmasi akun, schema, secret, atau deployment Supabase yang nyata.
- Browser lokal memblokir navigasi, sehingga pengujian manual Chrome DevTools pada semua viewport belum diklaim.
- Runtime yang tersedia lokal adalah Node.js 22, sementara proyek menargetkan Node.js 24. Jalankan kembali `npm ci`, `npm run build`, dan `npm test` pada Node.js 24 sebelum deployment akhir.
- Bila 405 masih muncul setelah root deploy benar, periksa log function Vercel dan respons `/api/auth/login` untuk membedakan masalah routing dari konfigurasi Supabase atau akun yang tidak ada.

## Keamanan

- Paket hasil perbaikan sengaja tidak menyertakan `.env.local`, `.vercel/`, `.git/`, atau `node_modules/`.
- Jika secrets pernah terbagikan, rotasi Supabase key dan `SESSION_SECRET`.
- Akun demo harus dianggap publik dan jangan digunakan untuk produksi.
