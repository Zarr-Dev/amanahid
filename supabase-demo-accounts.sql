-- DEMO / ISOLATED STAGING DATABASE ONLY.
-- Never run this script on a real school's production database.
-- It creates exactly one demo Guru and one demo Siswa account. It never creates an Admin.
-- Passwords are public demo credentials and must never be used for real accounts.
-- Run supabase-schema.sql first.

insert into public.teachers (email, name, password_hash, role, is_active)
values (
    'demo.guru@amanah.sch.id',
    'Guru Demo',
    crypt(encode(digest('GuruDemo2026!', 'sha256'), 'hex'), gen_salt('bf', 12)),
    'guru',
    true
)
on conflict (email) do update
set name = excluded.name,
    password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = true;

-- This student account is for login/dashboard demonstration only.
-- face_descriptors is intentionally empty, so it cannot pass face verification or record attendance.
insert into public.students (
    nisn, name, class_name, face_descriptors, email, password_hash, role, is_active
)
values (
    '0000000001',
    'Siswa Demo',
    'DEMO',
    '[]'::jsonb,
    'demo.siswa@amanah.sch.id',
    crypt(encode(digest('SiswaDemo2026!', 'sha256'), 'hex'), gen_salt('bf', 12)),
    'siswa',
    true
)
on conflict (nisn) do update
set name = excluded.name,
    class_name = excluded.class_name,
    face_descriptors = '[]'::jsonb,
    email = excluded.email,
    password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = true;
