create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null check (event_type in ('attendance_recorded','absence_submitted','absence_approved','absence_rejected')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 1000),
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  idempotency_key text not null unique
);
create index if not exists notifications_student_created_idx
  on public.notifications (student_id, created_at desc);
create index if not exists notifications_student_unread_idx
  on public.notifications (student_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
