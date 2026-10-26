-- One-time migration for existing Amanah.id installations.
-- Run this in the Supabase SQL Editor after deploying the 50 m default change.
-- Only upgrades the previous default value (35 m); any other administrator-configured
-- radius is preserved.
update public.school_settings
set radius = 50,
    updated_by = 'migration:geofence-default-50m',
    updated_at = now()
where id = '00000000-0000-0000-0000-000000000001'::uuid
  and radius = 35;
