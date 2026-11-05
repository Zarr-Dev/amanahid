-- Support foreign-key lookups when an official attendance row is deleted or reassigned.
create index if not exists offline_attendance_attendance_id_idx
    on public.offline_attendance_events (attendance_id);
