-- Link every newly created student to one active homeroom teacher.
-- Existing student rows are intentionally left untouched; Admin can link them
-- through a separately reviewed data-maintenance workflow.
alter table public.students
  add column if not exists homeroom_teacher_id uuid;

alter table public.students
  add constraint students_homeroom_teacher_id_fkey
  foreign key (homeroom_teacher_id) references public.teachers(id) on delete restrict;

create index if not exists students_homeroom_teacher_idx
  on public.students (homeroom_teacher_id);

-- Expand absence request categories and add minimal illness metadata.
alter table public.absence_requests
  drop constraint if exists absence_requests_absence_type_check;

alter table public.absence_requests
  add constraint absence_requests_absence_type_check
  check (absence_type in ('sick', 'permission', 'other', 'dispensation'));

alter table public.absence_requests
  add column if not exists severity text,
  add column if not exists medical_evidence_path text,
  add column if not exists medical_evidence_uploaded_at timestamptz;

alter table public.absence_requests
  drop constraint if exists absence_requests_severity_check;

alter table public.absence_requests
  add constraint absence_requests_severity_check
  check (
    (absence_type = 'sick' and (severity is null or severity in ('mild', 'moderate', 'severe'))) or
    (absence_type <> 'sick' and severity is null)
  ) not valid;

-- Teacher-side notification inbox. The browser has no direct table access.
create table if not exists public.teacher_notifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  event_type text not null check (event_type in ('dispensation_submitted')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 1000),
  related_id uuid references public.absence_requests(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  idempotency_key text not null unique
);

create index if not exists teacher_notifications_teacher_created_idx
  on public.teacher_notifications (teacher_id, created_at desc);

create index if not exists teacher_notifications_unread_idx
  on public.teacher_notifications (teacher_id, created_at desc)
  where read_at is null;

alter table public.teacher_notifications enable row level security;
revoke all on public.teacher_notifications from anon, authenticated, public;

-- Enforce homeroom assignment at the database boundary as well as in the API.
-- A teacher's first assigned student establishes their homeroom class; subsequent
-- students must belong to that same class.
create or replace function public.enforce_student_homeroom_assignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  teacher_class text;
  teacher_active boolean;
begin
  if new.homeroom_teacher_id is null then
    raise exception 'A homeroom teacher must be assigned to every new or reassigned student'
      using errcode = '23514';
  end if;

  select homeroom_class, is_active
    into teacher_class, teacher_active
    from public.teachers
    where id = new.homeroom_teacher_id
    for update;

  if not found or teacher_active is distinct from true then
    raise exception 'The selected homeroom teacher is unavailable'
      using errcode = '23503';
  end if;

  if teacher_class is null or btrim(teacher_class) = '' then
    update public.teachers
      set homeroom_class = btrim(new.class_name)
      where id = new.homeroom_teacher_id;
  elsif btrim(teacher_class) <> btrim(new.class_name) then
    raise exception 'Student class must match the homeroom teacher class'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists students_enforce_homeroom_assignment on public.students;
create trigger students_enforce_homeroom_assignment
before insert or update of homeroom_teacher_id, class_name on public.students
for each row execute function public.enforce_student_homeroom_assignment();

-- Create an inbox event atomically with every approved-scope dispensasi request.
create or replace function public.notify_homeroom_teacher_of_dispensation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  teacher_id_value uuid;
  student_name_value text;
  student_class_value text;
begin
  if new.absence_type <> 'dispensation' then
    return new;
  end if;

  select s.homeroom_teacher_id, s.name, s.class_name
    into teacher_id_value, student_name_value, student_class_value
    from public.students s
    where s.id = new.student_id;

  if teacher_id_value is null then
    raise exception 'Student has no assigned homeroom teacher'
      using errcode = '23514';
  end if;

  insert into public.teacher_notifications (
    teacher_id, event_type, title, body, related_id, idempotency_key
  ) values (
    teacher_id_value,
    'dispensation_submitted',
    'Pengajuan dispensasi baru',
    student_name_value || ' (' || student_class_value || ') mengajukan dispensasi pada ' || new.absence_date::text || '.',
    new.id,
    'dispensation:' || new.id::text
  )
  on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists absence_request_notify_homeroom_teacher on public.absence_requests;
create trigger absence_request_notify_homeroom_teacher
after insert on public.absence_requests
for each row execute function public.notify_homeroom_teacher_of_dispensation();

-- Keep the medical evidence bucket private and restrict the accepted file types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-evidence',
  'medical-evidence',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;
