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
    created_at timestamptz not null default now()
);

-- Keep the requested NISN lookup index (the unique constraint also indexes nisn).
create index if not exists idx_students_nisn on public.students (nisn);

-- Store teacher identities independently of browser-local demo credentials.
create table if not exists public.teachers (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    name text not null,
    created_at timestamptz not null default now()
);

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
    radius numeric not null default 35 check (radius between 10 and 500),
    updated_by text not null default 'system',
    updated_at timestamptz not null default now()
);

insert into public.school_settings (id, lat, lng, radius)
values ('00000000-0000-0000-0000-000000000001'::uuid, -6.253590517740096, 106.60299502682263, 35)
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
