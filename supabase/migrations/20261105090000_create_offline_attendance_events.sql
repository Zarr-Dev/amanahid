-- Offline attendance is deliberately stored as a review request, never as an official
-- attendance record. A teacher or Admin must explicitly approve it after reconnection.
create table if not exists public.offline_attendance_events (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null unique,
    student_id uuid not null references public.students(id) on delete restrict,
    claimed_at timestamptz not null,
    gps_lat numeric(10, 7) not null,
    gps_lng numeric(10, 7) not null,
    gps_accuracy numeric(10, 2) not null,
    gps_timestamp timestamptz not null,
    face_liveness_completed boolean not null default false,
    face_model_key text not null,
    status text not null default 'pending_review'
        check (status in ('pending_review', 'approved', 'rejected')),
    review_notes text,
    reviewed_by text,
    reviewed_at timestamptz,
    attendance_id uuid references public.attendance(id) on delete set null,
    received_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint offline_attendance_accuracy_positive check (gps_accuracy > 0),
    constraint offline_attendance_latitude_valid check (gps_lat between -90 and 90),
    constraint offline_attendance_longitude_valid check (gps_lng between -180 and 180),
    constraint offline_attendance_review_consistency check (
        (status = 'pending_review' and reviewed_at is null and reviewed_by is null)
        or
        (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
    )
);

create index if not exists offline_attendance_status_received_idx
    on public.offline_attendance_events (status, received_at desc);
create index if not exists offline_attendance_student_claimed_idx
    on public.offline_attendance_events (student_id, claimed_at desc);
create unique index if not exists offline_attendance_single_approved_idx
    on public.offline_attendance_events (student_id, claimed_at)
    where status = 'approved';

alter table public.offline_attendance_events enable row level security;
revoke all on table public.offline_attendance_events from anon, authenticated;
grant select, insert, update, delete on table public.offline_attendance_events to service_role;

comment on table public.offline_attendance_events is
    'Unverified offline attendance requests. Never treated as official attendance until explicit Admin or homeroom-teacher review.';
comment on column public.offline_attendance_events.face_liveness_completed is
    'Client-reported liveness result only; this field is not server-verified and must never authorize attendance by itself.';
