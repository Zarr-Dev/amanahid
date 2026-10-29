create table if not exists public.absence_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  absence_date date not null,
  absence_type text not null check (absence_type in ('sick','permission','other')),
  note text not null check (char_length(trim(note)) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint absence_requests_review_state check (
    (status = 'pending' and reviewed_at is null) or
    (status <> 'pending' and reviewed_at is not null)
  )
);
create index if not exists absence_requests_date_status_idx
  on public.absence_requests (absence_date desc, status);
create index if not exists absence_requests_student_date_idx
  on public.absence_requests (student_id, absence_date desc);
alter table public.absence_requests enable row level security;
revoke all on public.absence_requests from anon, authenticated;
