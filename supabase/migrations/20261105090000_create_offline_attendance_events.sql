-- Offline attendance is stored as a review request, never as an official
-- attendance record until a trusted Admin or homeroom teacher approves it.
create table if not exists public.offline_attendance_events (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null unique,
    student_id uuid not null references public.students(id) on delete restrict,
    claimed_at timestamptz not null,
    school_date date not null,
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
create unique index if not exists offline_attendance_one_pending_per_school_day_idx
    on public.offline_attendance_events (student_id, school_date)
    where status = 'pending_review';

alter table public.offline_attendance_events enable row level security;
revoke all on table public.offline_attendance_events from anon, authenticated;
grant select, insert, update, delete on table public.offline_attendance_events to service_role;

comment on table public.offline_attendance_events is
    'Unverified offline attendance requests. Never treated as official attendance until explicit Admin or homeroom-teacher review.';
comment on column public.offline_attendance_events.face_liveness_completed is
    'Client-reported liveness result only; this field is not server-verified and must never authorize attendance by itself.';

-- Make approval/rejection atomic: the event status, official attendance row,
-- and audit entry either all commit or all roll back.
create or replace function public.review_offline_attendance_event(
    p_event_id uuid,
    p_decision text,
    p_review_notes text,
    p_reviewed_by text,
    p_actor_role text,
    p_teacher_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_event public.offline_attendance_events%rowtype;
    v_student public.students%rowtype;
    v_attendance_id uuid;
    v_attendance_date date;
    v_attendance_time time without time zone;
    v_status text;
begin
    if p_decision not in ('approve', 'reject') then
        raise exception 'Invalid offline attendance decision' using errcode = '22023';
    end if;
    if p_actor_role not in ('admin', 'guru') then
        raise exception 'Admin or teacher role is required' using errcode = '42501';
    end if;
    if p_reviewed_by is null or length(trim(p_reviewed_by)) < 3 then
        raise exception 'Reviewer identity is required' using errcode = '22023';
    end if;
    if p_review_notes is null or length(trim(p_review_notes)) < 8 or length(p_review_notes) > 500 then
        raise exception 'Review notes must contain 8 to 500 characters' using errcode = '22023';
    end if;

    select e.*
      into v_event
      from public.offline_attendance_events e
     where e.event_id = p_event_id
     for update;
    if not found then
        raise exception 'Offline attendance request was not found' using errcode = 'P0002';
    end if;
    if v_event.status <> 'pending_review' then
        raise exception 'Offline attendance request has already been reviewed' using errcode = '23505';
    end if;

    select s.*
      into v_student
      from public.students s
     where s.id = v_event.student_id
     for update;
    if not found then
        raise exception 'Student record was not found' using errcode = 'P0002';
    end if;

    if p_actor_role = 'guru' then
        if p_teacher_id is null or v_student.homeroom_teacher_id is distinct from p_teacher_id then
            raise exception 'Teachers may review only students in their homeroom' using errcode = '42501';
        end if;
        if not exists (
            select 1 from public.teachers t
             where t.id = p_teacher_id and t.is_active = true
        ) then
            raise exception 'An active teacher account is required' using errcode = '42501';
        end if;
    end if;

    v_status := case when p_decision = 'approve' then 'approved' else 'rejected' end;
    if p_decision = 'approve' then
        if v_student.is_active is distinct from true then
            raise exception 'Inactive students cannot have offline attendance approved' using errcode = '42501';
        end if;
        v_attendance_date := v_event.school_date;
        v_attendance_time := (v_event.claimed_at at time zone 'Asia/Jakarta')::time;
        insert into public.attendance (
            student_id, date, time, confidence, method, idempotency_key
        ) values (
            v_event.student_id,
            v_attendance_date,
            v_attendance_time,
            null,
            'offline-reviewed',
            v_event.event_id
        )
        returning id into v_attendance_id;
    end if;

    update public.offline_attendance_events
       set status = v_status,
           review_notes = trim(p_review_notes),
           reviewed_by = trim(p_reviewed_by),
           reviewed_at = now(),
           attendance_id = v_attendance_id
     where id = v_event.id;

    insert into public.audit_log (
        actor_email, actor_role, action, target_table, target_id, metadata
    ) values (
        trim(p_reviewed_by),
        p_actor_role,
        'attendance.offline_' || v_status,
        'offline_attendance_events',
        v_event.id::text,
        jsonb_build_object(
            'student_id', v_student.id,
            'nisn', v_student.nisn,
            'event_id', v_event.event_id,
            'attendance_id', v_attendance_id,
            'school_date', v_event.school_date,
            'notes', trim(p_review_notes)
        )
    );

    return jsonb_build_object(
        'event_id', v_event.event_id,
        'status', v_status,
        'attendance_id', v_attendance_id,
        'official_attendance', p_decision = 'approve',
        'student_id', v_student.id,
        'nisn', v_student.nisn,
        'name', v_student.name,
        'class_name', v_student.class_name,
        'parent_whatsapp', v_student.parent_whatsapp,
        'attendance_date', v_attendance_date,
        'attendance_time', v_attendance_time
    );
end;
$$;

revoke all on function public.review_offline_attendance_event(uuid, text, text, text, text, uuid)
    from public, anon, authenticated;
grant execute on function public.review_offline_attendance_event(uuid, text, text, text, text, uuid)
    to service_role;

comment on function public.review_offline_attendance_event(uuid, text, text, text, text, uuid) is
    'Atomically reviews an offline attendance request, writes official attendance only on approval, and creates the audit entry.';
