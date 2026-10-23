<div align="center">
  <img src="assets/amanah-logo.png" alt="Amanah.id Logo" width="100" />
  <h1>Amanah.id</h1>
  <p><b>Presensi Sekolah Masa Kini. Anti Titip Absen.</b></p>
  <p>Verifikasi Wajah (Face Recognition) + Lokasi (GPS Geofencing) + Liveness Detection. Tanpa Hardware Tambahan.</p>
  
  [![Vercel Deployment](https://img.shields.io/badge/Vercel-Live-success?logo=vercel)](https://amanahids.vercel.app)
  [![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
</div>

---

## 🚀 Tentang Proyek
Amanah.id adalah aplikasi presensi digital berbasis *Progressive Web App* (PWA) yang dirancang untuk sekolah. Sistem ini memecahkan masalah "absen titip" dan pemalsuan lokasi dengan **Multi-Factor Authentication (MFA)**:
1. **Wajah (Face Recognition):** Menggunakan `face-api.js` (FaceNet 128-d) yang mengekstrak vektor wajah tanpa menyimpan foto asli.
2. **Liveness:** Mewajibkan gerakan kepala untuk membedakan wajah asli dari foto/layar.
3. **Lokasi (GPS Geofencing):** Mengunci presensi dalam radius (bisa diatur guru lewat peta) menggunakan Haversine Formula.
4. **Anti-Fake GPS:** Validasi lokasi ulang dilakukan di server-side (Vercel Function).

## ✨ Fitur Utama
- **Dashboard Guru:** Menentukan titik pusat sekolah lewat peta (Leaflet), mengatur radius, mendaftarkan siswa, melihat database presensi, dan ekspor CSV.
- **Dashboard Siswa:** Melakukan presensi dengan verifikasi wajah dan GPS. Hanya bisa absen di dalam radius sekolah.
- **Notifikasi WhatsApp:** Otomatis mengirim pesan ke orang tua saat siswa berhasil presensi (via Fonnte API).
- **Multi-Bahasa & Tema:** Mendukung ID, EN, AR (termasuk RTL), dan mode gelap/terang.
- **Desain Modern:** UI/UX bergaya SaaS dengan *Hero Section*, *Floating Cards*, dan *Splash Screen* animasi.

## 🛠️ Teknologi yang Digunakan
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **AI & Computer Vision:** `face-api.js` (TensorFlow.js)
- **Peta:** Leaflet + OpenStreetMap
- **Backend (API):** Vercel Serverless Functions (Node.js)
- **Database:** Supabase (PostgreSQL) dengan *Row Level Security*
- **Pesan:** Fonnte API (WhatsApp Gateway)

## 🚦 Menjalankan Secara Lokal
1. Clone repositori ini:
   ```bash
   git clone https://github.com/Zarr-Dev/amanahid.git
   cd amanahid
   ```

## Deployment and account setup

1. Apply `supabase-schema.sql` in the Supabase SQL editor before deploying the API.
   Existing teacher and student rows remain, but older rows do not have passwords;
   an Admin must set their email/password from **Users** before they can sign in.
2. Set these Vercel environment variables:
   - `APP_ORIGIN`: the exact deployed origin, for example `https://school.example`.
   - `SUPABASE_URL` and `SUPABASE_SECRET_KEY`: the project URL and server-side service
     role key. Never expose the secret key in browser code.
   - `SESSION_SECRET`: a random value with at least 32 characters.
   - `FONNTE_TOKEN`: optional; required only for WhatsApp notifications.
3. Create the first Admin manually in Supabase Dashboard → **SQL Editor**. Replace
   the example email, password, and name with your own values before running this
   SQL. The frontend sends the password as a SHA-256 hex digest; this SQL hashes
   that digest with bcrypt cost 12 to match the server login flow:

   ```sql
   -- Replace the email and password with unique credentials before executing.
   insert into public.admin_users (email, password_hash, name)
   values (
     'admin@amanah.sch.id',
     crypt(encode(digest('SuperSecurePass123!', 'sha256'), 'hex'), gen_salt('bf', 12)),
     'Administrator Amanah'
   );
   ```

   Do not use the example password in a deployed environment. After creating the
   account, open the website, select **Login**, choose **Login sebagai Admin**,
   enter the admin email and password, and answer the captcha (`8`).

4. Install dependencies with `npm install`. Run the focused security tests with
   `npm test`.

Teacher and student credentials are provisioned through the Admin dashboard or the
teacher student-registration form. Browser-local demo credentials and self-selected
`X-Role` headers are not accepted; API access uses short-lived HMAC-signed sessions.
The schema also enables deny-all RLS policies on the Admin and audit tables.