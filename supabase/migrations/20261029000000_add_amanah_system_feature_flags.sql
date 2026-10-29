create table if not exists public.system_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000002'::uuid
    check (id = '00000000-0000-0000-0000-000000000002'::uuid),
  feature_flags jsonb not null default '{}'::jsonb,
  updated_by text not null default 'system',
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;
revoke all on public.system_settings from anon, authenticated;
