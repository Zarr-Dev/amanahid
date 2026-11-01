-- Student address, homeroom assignment, medical evidence and short dispensations.
alter table public.students add column if not exists address text;
alter table public.students drop constraint if exists students_address_length_check;
alter table public.students add constraint students_address_length_check
  check (address is null or char_length(address) <= 500);

alter table public.teachers add column if not exists homeroom_class text;
alter table public.teachers drop constraint if exists teachers_homeroom_class_length_check;
alter table public.teachers add constraint teachers_homeroom_class_length_check
  check (homeroom_class is null or char_length(trim(homeroom_class)) between 1 and 40);
create unique index if not exists teachers_one_homeroom_per_class_idx
  on public.teachers (lower(trim(homeroom_class)))
  where homeroom_class is not null and trim(homeroom_class) <> '';

alter table public.school_settings
  add column if not exists dispensation_open_time time not null default '07:00',
  add column if not exists dispensation_close_time time not null default '16:00';
alter table public.school_settings drop constraint if exists school_settings_dispensation_hours_check;
alter table public.school_settings add constraint school_settings_dispensation_hours_check
  check (dispensation_open_time < dispensation_close_time);

alter table public.absence_requests
  add column if not exists estimated_rest_days smallint,
  add column if not exists medical_file_path text,
  add column if not exists medical_file_mime text,
  add column if not exists medical_uploaded_at timestamptz,
  add column if not exists dispensation_kind text,
  add column if not exists start_time time,
  add column if not exists end_time time;

alter table public.absence_requests
  drop constraint if exists absence_requests_absence_type_check,
  drop constraint if exists absence_requests_status_check,
  drop constraint if exists absence_requests_review_state,
  drop constraint if exists absence_requests_estimated_rest_days_check,
  drop constraint if exists absence_requests_dispensation_fields_check,
  drop constraint if exists absence_requests_medical_evidence_check;

alter table public.absence_requests
  add constraint absence_requests_absence_type_check check (absence_type in ('sick','permission','other','dispensation')),
  add constraint absence_requests_status_check check (status in ('pending','awaiting_medical','evidence_submitted','approved','rejected')),
  add constraint absence_requests_review_state check ((status='pending' and reviewed_at is null) or (status<>'pending' and reviewed_at is not null)),
  add constraint absence_requests_estimated_rest_days_check check (estimated_rest_days is null or estimated_rest_days between 1 and 30),
  add constraint absence_requests_dispensation_fields_check check (
    (absence_type='dispensation' and dispensation_kind in ('temporary_exit','late_arrival','early_departure','class_permission','other')
      and start_time is not null and end_time is not null and start_time<end_time)
    or (absence_type<>'dispensation' and dispensation_kind is null and start_time is null and end_time is null)
  ),
  add constraint absence_requests_medical_evidence_check check (
    (absence_type<>'sick' and estimated_rest_days is null and medical_file_path is null and medical_file_mime is null and medical_uploaded_at is null)
    or (absence_type='sick' and status in ('pending','awaiting_medical') and estimated_rest_days is null and medical_file_path is null and medical_file_mime is null and medical_uploaded_at is null)
    or (absence_type='sick' and status in ('evidence_submitted','approved') and estimated_rest_days between 1 and 30
      and medical_file_path is not null and medical_file_mime in ('application/pdf','image/jpeg','image/png') and medical_uploaded_at is not null)
    or (absence_type='sick' and status='rejected' and (
      (estimated_rest_days is null and medical_file_path is null and medical_file_mime is null and medical_uploaded_at is null)
      or (estimated_rest_days between 1 and 30 and medical_file_path is not null and medical_file_mime in ('application/pdf','image/jpeg','image/png') and medical_uploaded_at is not null)
    ))
  );

drop index if exists public.absence_requests_one_pending_per_date_idx;
create unique index absence_requests_one_active_per_date_idx
  on public.absence_requests(student_id, absence_date)
  where status in ('pending','awaiting_medical','evidence_submitted');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('medical-evidence','medical-evidence',false,5242880,array['application/pdf','image/jpeg','image/png']::text[])
on conflict (id) do update set name=excluded.name,public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
