create unique index if not exists absence_requests_one_pending_per_date_idx
on public.absence_requests (student_id, absence_date)
where status = 'pending';