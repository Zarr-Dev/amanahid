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

For an existing database created with the previous 35 m default, run
`supabase-geofence-50m-migration.sql` once in Supabase SQL Editor. It updates only
the previous default value of 35 m; other radius values configured by an administrator
are preserved. New installations use 50 m by default.

For an isolated demo/staging database only, run `supabase-demo-accounts.sql` after
`supabase-schema.sql`. It creates exactly one demo Guru and one demo Siswa account
and never creates an Admin:

- Guru demo: `demo.guru@amanah.sch.id` / `GuruDemo2026!`
- Siswa demo: `demo.siswa@amanah.sch.id` / `SiswaDemo2026!`

These credentials are intentionally public and must never be used on a production
school database. The demo Siswa has no face descriptor, so it tests login and dashboard
routing only, not real attendance.

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
     'REPLACE_WITH_REAL_ADMIN_EMAIL@your-school.sch.id',
     crypt(encode(digest('REPLACE_WITH_UNIQUE_ADMIN_PASSWORD', 'sha256'), 'hex'), gen_salt('bf', 12)),
     'Administrator Amanah'
   );
   ```

   Replace both placeholder values before running the SQL. Create only the one
   official Admin account for the school. There is deliberately no public Admin demo
   login or seeded Admin password. After creating the account, open the website,
   choose **Login sebagai Admin**, enter the real Admin credentials, and answer the
   captcha (`8`).

4. Install dependencies with `npm install`. Run the focused security tests with
   `npm test`.

Teacher and student credentials are provisioned through the Admin dashboard or the
teacher student-registration form. Browser-local demo credentials and self-selected
`X-Role` headers are not accepted; API access uses short-lived HMAC-signed sessions.
The schema also enables deny-all RLS policies on the Admin and audit tables.
## Login / Vercel deployment troubleshooting

- In Vercel Project Settings, set **Root Directory** to the project root that contains `api/`, `package.json`, and `vercel.json`. Do not set it to `public/`; that folder only contains the frontend files. A platform-generated HTTP 405 on every login request often means the request is not reaching the intended API function.
- `vercel.json` includes a filesystem-first route fallback so unknown client-side paths render the app shell instead of falling back to the default Vercel 404 page. This keeps deployments from showing the generic black `NOT_FOUND` template when the app is deep-linked.
- After deploying, open `/api/health`. It should return HTTP 200 and JSON containing `ok: true` and `service: "Amanah.id API"`. If it returns 404/405 or an HTML page, inspect the selected Vercel Root Directory and the deployment build output first.
- Configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SESSION_SECRET` (at least 32 characters) and `APP_ORIGIN` (the exact deployed origin, without a trailing slash) in Vercel Environment Variables. Missing Supabase settings cause a clear HTTP 503 login diagnostic instead of a misleading credential error. `FONNTE_TOKEN` is optional unless WhatsApp delivery is needed. Redeploy after changing environment variables.
- Run `supabase-schema.sql` in the intended Supabase project before testing accounts. The official Admin is never auto-created. For an isolated demo/staging database only, run `supabase-demo-accounts.sql` to create one Guru demo and one Siswa demo; it never creates an Admin. Demo credentials are public and must never be seeded into a real school production database. The demo Siswa intentionally has no face descriptor, so it tests login/dashboard routing only and cannot record attendance.
- Public account self-signup is disabled. Admin provisions Guru accounts. A logged-in Guru creates Siswa accounts using the student form, which requires NISN, an initial password, and face descriptors. This keeps the stored row aligned with the `students` schema and avoids accounts with empty face data.
- Use a supported Node.js release for deployment; this project declares Node.js `24.x`. Run `npm ci`, `npm run build`, and `npm test` in the project root before deploying.
