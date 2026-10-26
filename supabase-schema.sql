-- Enable UUID generation for the primary keys.
create extension if not exists pgcrypto;

-- Store registered students and face descriptors (never original photos).
create table if not exists public.students (
    id uuid primary key default gen_random_uuid(),
    nisn text not null unique,
    name text not null,
    class_name text not null,
    parent_whatsapp text,
    face_descriptors jsonb not null,
    email text unique,
    password_hash text,
    role text not null default 'siswa' check (role = 'siswa'),
    is_active boolean not null default true,
    last_login_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.students add column if not exists email text;
alter table public.students add column if not exists password_hash text;
alter table public.students add column if not exists role text not null default 'siswa';
alter table public.students add column if not exists is_active boolean not null default true;
alter table public.students add column if not exists last_login_at timestamptz;
create unique index if not exists idx_students_email on public.students (lower(email))
    where email is not null;

-- Keep the requested NISN lookup index (the unique constraint also indexes nisn).
create index if not exists idx_students_nisn on public.students (nisn);

-- Store teacher identities independently of browser-local demo credentials.
create table if not exists public.teachers (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    name text not null,
    password_hash text,
    role text not null default 'guru' check (role = 'guru'),
    is_active boolean not null default true,
    last_login_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.teachers add column if not exists password_hash text;
alter table public.teachers add column if not exists role text not null default 'guru';
alter table public.teachers add column if not exists is_active boolean not null default true;
alter table public.teachers add column if not exists last_login_at timestamptz;
create unique index if not exists idx_teachers_email_lower on public.teachers (lower(email));

create table if not exists public.admin_users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password_hash text not null,
    name text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    last_login_at timestamptz
);

create table if not exists public.audit_log (
    id uuid primary key default gen_random_uuid(),
    actor_email text not null,
    actor_role text not null,
    action text not null,
    target_table text,
    target_id text,
    metadata jsonb,
    created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);
create index if not exists idx_audit_log_actor_email on public.audit_log (actor_email);

-- Enforce one attendance record per student per local school date.
create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete cascade,
    date date not null,
    time time not null,
    confidence numeric,
    method text not null default 'face-gps',
    idempotency_key uuid,
    created_at timestamptz not null default now(),
    constraint attendance_student_date_unique unique (student_id, date)
);

-- Keep request retries idempotent across serverless instances and restarts.
alter table public.attendance
    add column if not exists idempotency_key uuid;
create unique index if not exists idx_attendance_idempotency_key
    on public.attendance (idempotency_key)
    where idempotency_key is not null;

-- Speed up date-based attendance filtering.
create index if not exists idx_attendance_date on public.attendance (date);

-- Store the single school geofence used by both the browser and attendance API.
create table if not exists public.school_settings (
    id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid
        check (id = '00000000-0000-0000-0000-000000000001'::uuid),
    lat numeric not null check (lat between -90 and 90),
    lng numeric not null check (lng between -180 and 180),
    radius numeric not null default 50 check (radius between 10 and 500),
    timezone text not null default 'Asia/Jakarta',
    entry_time time not null default '07:00',
    late_tolerance_min integer not null default 15 check (late_tolerance_min between 0 and 180),
    updated_by text not null default 'system',
    updated_at timestamptz not null default now()
);

alter table public.school_settings add column if not exists timezone text not null default 'Asia/Jakarta';
alter table public.school_settings add column if not exists entry_time time not null default '07:00';
alter table public.school_settings add column if not exists late_tolerance_min integer not null default 15;

insert into public.school_settings (id, lat, lng, radius)
values ('00000000-0000-0000-0000-000000000001'::uuid, -6.253590517740096, 106.60299502682263, 50)
on conflict (id) do nothing;

-- Deny every direct browser role; only the server-side secret key may access rows.
alter table public.students enable row level security;
drop policy if exists "deny all direct access" on public.students;
create policy "deny all direct access" on public.students
    for all using (false) with check (false);

alter table public.teachers enable row level security;
drop policy if exists "deny all direct access" on public.teachers;
create policy "deny all direct access" on public.teachers
    for all using (false) with check (false);

alter table public.attendance enable row level security;
drop policy if exists "deny all direct access" on public.attendance;
create policy "deny all direct access" on public.attendance
    for all using (false) with check (false);

alter table public.school_settings enable row level security;
drop policy if exists "deny all direct access" on public.school_settings;
create policy "deny all direct access" on public.school_settings
    for all using (false) with check (false);

alter table public.admin_users enable row level security;
drop policy if exists "deny all direct access" on public.admin_users;
create policy "deny all direct access" on public.admin_users
    for all using (false) with check (false);

alter table public.audit_log enable row level security;
drop policy if exists "deny all direct access" on public.audit_log;
create policy "deny all direct access" on public.audit_log
    for all using (false) with check (false);
