-- Amanah.id: make the backend-only access model explicit for every
-- application table that already has RLS enabled but lacked a policy.
--
-- The browser must never access these records directly. Vercel API routes
-- use the server-side Supabase secret key; that privileged backend path is
-- intentionally kept separate from anon/authenticated browser roles.
--
-- USING (false) blocks reads, updates, and deletes.
-- WITH CHECK (false) blocks inserts and updated row values.
-- This does not grant or broaden any privilege.

ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all direct access" ON public.absence_requests;
CREATE POLICY "deny all direct access"
  ON public.absence_requests
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all direct access" ON public.notifications;
CREATE POLICY "deny all direct access"
  ON public.notifications
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.offline_attendance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all direct access" ON public.offline_attendance_events;
CREATE POLICY "deny all direct access"
  ON public.offline_attendance_events
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all direct access" ON public.system_settings;
CREATE POLICY "deny all direct access"
  ON public.system_settings
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.teacher_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all direct access" ON public.teacher_notifications;
CREATE POLICY "deny all direct access"
  ON public.teacher_notifications
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
