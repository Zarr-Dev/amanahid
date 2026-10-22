# Amanah.id

APSI project from Al-Fityan School.

Team:
- Khairul Azhar (Programming Design)
- Rezky Akhdani Setiawan (Website Designer)
- Kaifasa Semesta (Poster & Documenter)

## Deployment configuration

The Vercel API uses these environment variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (server-side only; never expose it to the browser)
- `APP_ORIGIN`
- `FONNTE_TOKEN` (WhatsApp notifications)

Run `supabase-schema.sql` in the Supabase SQL editor before deploying so that
the `school_settings` row and deny-all RLS policy are created. The frontend
loads the location from `/api/settings`; attendance submissions are checked
against that same database location.

Student face descriptors are not exposed through the student list API. After
liveness succeeds, `/api/face-match` compares the student's live descriptor
against their registered samples on the server using the 0.45 distance
threshold.

The current `X-Role` teacher check is a documented placeholder, not production
authentication. Replace it with Supabase Auth JWT verification before
deployment to untrusted users.

## End-to-end geofence check

1. Log in as a teacher and open **Lihat peta / View map**.
2. Choose **Atur titik sekolah / Set school location**, click a new point on the
   map, adjust the 10–500 m radius, then save.
3. Log out and log in as a student. Start check-in at a location outside the
   newly saved radius; the camera flow or server must reject the attendance.
4. Test again inside the radius with GPS accuracy of 35 m or better. A
   registered face should pass liveness and record attendance.
5. Verify that bad coordinates, low-confidence requests, and repeated requests
   are rejected, and that WhatsApp notification behavior remains unchanged.
