alter table public.school_settings
    add column if not exists attendance_whatsapp_enabled boolean not null default true,
    add column if not exists attendance_whatsapp_template text not null default 'Assalamu''alaikum, Bapak/Ibu. Kami informasikan bahwa {name} telah tercatat hadir di Al-Fityan School pada {date} pukul {time}. Terima kasih.';

alter table public.attendance
    add column if not exists parent_whatsapp_status text not null default 'not_applicable',
    add column if not exists parent_whatsapp_request_id text,
    add column if not exists parent_whatsapp_message_ids jsonb not null default '[]'::jsonb,
    add column if not exists parent_whatsapp_error text,
    add column if not exists parent_whatsapp_updated_at timestamptz;

create index if not exists idx_attendance_parent_whatsapp_status
    on public.attendance (parent_whatsapp_status, date desc)
    where parent_whatsapp_status in ('failed', 'unknown', 'sending');

notify pgrst, 'reload schema';