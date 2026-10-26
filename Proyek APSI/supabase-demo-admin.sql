-- DEVELOPMENT / ISOLATED STAGING ONLY.
-- This account uses a publicly displayed demo password. NEVER run this seed on a production school database.
-- Run supabase-schema.sql first. The password hash matches the SHA-256-then-bcrypt scheme in api/_lib/admin-auth.js.
insert into public.admin_users (email, password_hash, name, is_active)
values (
    'admin@amanah.sch.id',
    '$2b$12$kEgn5FHjgws6yF42oILz2ucpKDX05TVMMV.xcdEKdmEbg2IvkuV3m',
    'Admin Demo',
    true
)
on conflict (email) do nothing;
