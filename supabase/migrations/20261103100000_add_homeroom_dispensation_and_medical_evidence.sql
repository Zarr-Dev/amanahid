-- Amanah ID production schema synchronization.
-- This migration is backward-compatible with the existing medical-evidence schema.
-- It deliberately leaves existing student homeroom assignments NULL for Admin review.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS homeroom_teacher_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_homeroom_teacher_id_fkey'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_homeroom_teacher_id_fkey
      FOREIGN KEY (homeroom_teacher_id)
      REFERENCES public.teachers(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS students_homeroom_teacher_idx
  ON public.students (homeroom_teacher_id);

ALTER TABLE public.absence_requests
  DROP CONSTRAINT IF EXISTS absence_requests_absence_type_check;

ALTER TABLE public.absence_requests
  ADD CONSTRAINT absence_requests_absence_type_check
  CHECK (absence_type IN ('sick', 'permission', 'other', 'dispensation'));

ALTER TABLE public.absence_requests
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS medical_evidence_path text,
  ADD COLUMN IF NOT EXISTS medical_evidence_uploaded_at timestamptz;

ALTER TABLE public.absence_requests
  DROP CONSTRAINT IF EXISTS absence_requests_severity_check;

ALTER TABLE public.absence_requests
  ADD CONSTRAINT absence_requests_severity_check
  CHECK (
    (absence_type = 'sick' AND (severity IS NULL OR severity IN ('mild', 'moderate', 'severe'))) OR
    (absence_type <> 'sick' AND severity IS NULL)
  ) NOT VALID;

-- The database previously enforced a legacy workflow using medical_file_path,
-- medical_file_mime and medical_uploaded_at. The current API uses the new
-- medical_evidence_path / medical_evidence_uploaded_at pair after approval.
-- Keep both representations valid so existing records and old clients remain safe.
ALTER TABLE public.absence_requests
  DROP CONSTRAINT IF EXISTS absence_requests_medical_evidence_check;

ALTER TABLE public.absence_requests
  ADD CONSTRAINT absence_requests_medical_evidence_check
  CHECK (
    (
      absence_type <> 'sick'
      AND severity IS NULL
      AND estimated_rest_days IS NULL
      AND medical_file_path IS NULL
      AND medical_file_mime IS NULL
      AND medical_uploaded_at IS NULL
      AND medical_evidence_path IS NULL
      AND medical_evidence_uploaded_at IS NULL
    )
    OR
    (
      absence_type = 'sick'
      AND (severity IS NULL OR severity IN ('mild', 'moderate', 'severe'))
      AND (
        (medical_evidence_path IS NULL AND medical_evidence_uploaded_at IS NULL)
        OR
        (medical_evidence_path IS NOT NULL AND medical_evidence_uploaded_at IS NOT NULL)
      )
      AND (
        (
          status IN ('pending', 'awaiting_medical')
          AND estimated_rest_days IS NULL
          AND medical_file_path IS NULL
          AND medical_file_mime IS NULL
          AND medical_uploaded_at IS NULL
        )
        OR
        (
          status IN ('evidence_submitted', 'approved')
          AND estimated_rest_days BETWEEN 1 AND 30
          AND medical_file_path IS NOT NULL
          AND medical_file_mime IN ('application/pdf', 'image/jpeg', 'image/png')
          AND medical_uploaded_at IS NOT NULL
        )
        OR
        (
          status = 'rejected'
          AND (
            (
              estimated_rest_days IS NULL
              AND medical_file_path IS NULL
              AND medical_file_mime IS NULL
              AND medical_uploaded_at IS NULL
            )
            OR
            (
              estimated_rest_days BETWEEN 1 AND 30
              AND medical_file_path IS NOT NULL
              AND medical_file_mime IN ('application/pdf', 'image/jpeg', 'image/png')
              AND medical_uploaded_at IS NOT NULL
            )
          )
        )
        OR
        (
          status IN ('pending', 'approved', 'rejected')
          AND estimated_rest_days IS NULL
          AND medical_file_path IS NULL
          AND medical_file_mime IS NULL
          AND medical_uploaded_at IS NULL
        )
      )
    )
  ) NOT VALID;

ALTER TABLE public.absence_requests
  VALIDATE CONSTRAINT absence_requests_severity_check;
ALTER TABLE public.absence_requests
  VALIDATE CONSTRAINT absence_requests_medical_evidence_check;

-- The browser has no direct table access; Vercel uses the server-side secret.
CREATE TABLE IF NOT EXISTS public.teacher_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('dispensation_submitted')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  related_id uuid REFERENCES public.absence_requests(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS teacher_notifications_teacher_created_idx
  ON public.teacher_notifications (teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS teacher_notifications_unread_idx
  ON public.teacher_notifications (teacher_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.teacher_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_notifications FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.notify_homeroom_teacher_of_dispensation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  teacher_id_value uuid;
  student_name_value text;
  student_class_value text;
BEGIN
  IF NEW.absence_type <> 'dispensation' THEN
    RETURN NEW;
  END IF;

  SELECT s.homeroom_teacher_id, s.name, s.class_name
    INTO teacher_id_value, student_name_value, student_class_value
    FROM public.students s
    WHERE s.id = NEW.student_id;

  IF teacher_id_value IS NULL THEN
    RAISE EXCEPTION 'Student has no assigned homeroom teacher'
      USING errcode = '23514';
  END IF;

  INSERT INTO public.teacher_notifications (
    teacher_id, event_type, title, body, related_id, idempotency_key
  ) VALUES (
    teacher_id_value,
    'dispensation_submitted',
    'Pengajuan dispensasi baru',
    student_name_value || ' (' || student_class_value || ') mengajukan dispensasi pada ' || NEW.absence_date::text || '.',
    NEW.id,
    'dispensation:' || NEW.id::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS absence_request_notify_homeroom_teacher ON public.absence_requests;
CREATE TRIGGER absence_request_notify_homeroom_teacher
AFTER INSERT ON public.absence_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_homeroom_teacher_of_dispensation();

-- Keep medical evidence private and restrict accepted file types.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-evidence',
  'medical-evidence',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
