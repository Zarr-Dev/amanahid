-- Sick evidence is attached before a request is submitted. Approved requests may later be revoked by their homeroom teacher.
ALTER TABLE public.absence_requests
  DROP CONSTRAINT IF EXISTS absence_requests_status_check;
ALTER TABLE public.absence_requests
  ADD CONSTRAINT absence_requests_status_check
  CHECK (status IN ('pending','awaiting_medical','evidence_submitted','approved','rejected','revoked'));

-- Preserve legacy medical-file columns while allowing the new private-storage flow and the revoked state.
ALTER TABLE public.absence_requests
  DROP CONSTRAINT IF EXISTS absence_requests_medical_evidence_check;
ALTER TABLE public.absence_requests
  ADD CONSTRAINT absence_requests_medical_evidence_check CHECK (
    (
      absence_type <> 'sick' AND severity IS NULL AND estimated_rest_days IS NULL
      AND medical_file_path IS NULL AND medical_file_mime IS NULL AND medical_uploaded_at IS NULL
      AND medical_evidence_path IS NULL AND medical_evidence_uploaded_at IS NULL
    )
    OR
    (
      absence_type = 'sick'
      AND (severity IS NULL OR severity IN ('mild','moderate','severe'))
      AND ((medical_evidence_path IS NULL AND medical_evidence_uploaded_at IS NULL)
        OR (medical_evidence_path IS NOT NULL AND medical_evidence_uploaded_at IS NOT NULL))
      AND (
        (status IN ('pending','awaiting_medical','revoked')
          AND estimated_rest_days IS NULL AND medical_file_path IS NULL
          AND medical_file_mime IS NULL AND medical_uploaded_at IS NULL)
        OR
        (status IN ('evidence_submitted','approved')
          AND estimated_rest_days BETWEEN 1 AND 30
          AND medical_file_path IS NOT NULL
          AND medical_file_mime IN ('application/pdf','image/jpeg','image/png')
          AND medical_uploaded_at IS NOT NULL)
        OR
        (status IN ('rejected','revoked') AND (
          (estimated_rest_days IS NULL AND medical_file_path IS NULL
            AND medical_file_mime IS NULL AND medical_uploaded_at IS NULL)
          OR
          (estimated_rest_days BETWEEN 1 AND 30 AND medical_file_path IS NOT NULL
            AND medical_file_mime IN ('application/pdf','image/jpeg','image/png')
            AND medical_uploaded_at IS NOT NULL)
        ))
        OR
        (status IN ('pending','approved','rejected','revoked')
          AND estimated_rest_days IS NULL AND medical_file_path IS NULL
          AND medical_file_mime IS NULL AND medical_uploaded_at IS NULL)
      )
    )
  ) NOT VALID;
ALTER TABLE public.absence_requests VALIDATE CONSTRAINT absence_requests_medical_evidence_check;

ALTER TABLE public.teacher_notifications
  DROP CONSTRAINT IF EXISTS teacher_notifications_event_type_check;
ALTER TABLE public.teacher_notifications
  ADD CONSTRAINT teacher_notifications_event_type_check
  CHECK (event_type IN ('dispensation_submitted','sick_submitted','absence_submitted'));

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_event_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_event_type_check
  CHECK (event_type IN ('attendance_recorded','absence_submitted','absence_approved','absence_rejected','absence_revoked'));

CREATE INDEX IF NOT EXISTS absence_requests_student_date_status_idx
  ON public.absence_requests (student_id, absence_date DESC, status);
CREATE INDEX IF NOT EXISTS absence_requests_status_created_idx
  ON public.absence_requests (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_homeroom_teacher_of_absence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  teacher_id_value uuid;
  student_name_value text;
  student_class_value text;
  event_type_value text;
  title_value text;
BEGIN
  SELECT s.homeroom_teacher_id, s.name, s.class_name
    INTO teacher_id_value, student_name_value, student_class_value
    FROM public.students s WHERE s.id = NEW.student_id;
  IF teacher_id_value IS NULL THEN
    RAISE EXCEPTION 'Student has no assigned homeroom teacher'
      USING errcode = '23514';
  END IF;
  event_type_value := CASE NEW.absence_type
    WHEN 'sick' THEN 'sick_submitted'
    WHEN 'dispensation' THEN 'dispensation_submitted'
    ELSE 'absence_submitted'
  END;
  title_value := CASE NEW.absence_type
    WHEN 'sick' THEN 'Pengajuan sakit baru'
    WHEN 'dispensation' THEN 'Pengajuan dispensasi baru'
    ELSE 'Pengajuan ketidakhadiran baru'
  END;
  INSERT INTO public.teacher_notifications
    (teacher_id, event_type, title, body, related_id, idempotency_key)
  VALUES
    (teacher_id_value, event_type_value, title_value,
     student_name_value || ' (' || student_class_value || ') mengajukan ' ||
     CASE NEW.absence_type WHEN 'sick' THEN 'sakit' WHEN 'permission' THEN 'izin'
       WHEN 'dispensation' THEN 'dispensasi' ELSE 'ketidakhadiran' END ||
     ' pada ' || NEW.absence_date::text || '.',
     NEW.id, 'absence-submitted:' || NEW.id::text)
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS absence_request_notify_homeroom_teacher ON public.absence_requests;
CREATE TRIGGER absence_request_notify_homeroom_teacher
AFTER INSERT ON public.absence_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_homeroom_teacher_of_absence();

CREATE OR REPLACE FUNCTION public.notify_student_of_absence_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_type_value text;
  title_value text;
  status_label text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved','rejected','revoked') THEN RETURN NEW; END IF;
  event_type_value := CASE NEW.status
    WHEN 'approved' THEN 'absence_approved'
    WHEN 'rejected' THEN 'absence_rejected'
    ELSE 'absence_revoked' END;
  title_value := CASE NEW.status
    WHEN 'approved' THEN 'Pengajuan ketidakhadiran disetujui'
    WHEN 'rejected' THEN 'Pengajuan ketidakhadiran ditolak'
    ELSE 'Persetujuan ketidakhadiran dicabut' END;
  status_label := CASE NEW.status
    WHEN 'approved' THEN 'disetujui'
    WHEN 'rejected' THEN 'ditolak'
    ELSE 'dicabut oleh wali kelas' END;
  INSERT INTO public.notifications
    (student_id, event_type, title, body, related_id, idempotency_key)
  VALUES
    (NEW.student_id, event_type_value, title_value,
     'Pengajuan ' || NEW.absence_date::text || ' telah ' || status_label ||
     CASE WHEN NEW.reviewed_by IS NOT NULL THEN ' oleh ' || NEW.reviewed_by ELSE '' END || '.',
     NEW.id, 'absence-status:' || NEW.id::text || ':' || NEW.status)
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS absence_request_notify_student_status ON public.absence_requests;
CREATE TRIGGER absence_request_notify_student_status
AFTER UPDATE OF status ON public.absence_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_student_of_absence_status();

-- Admin may create the account first and assign its homeroom from the Edit action.
CREATE OR REPLACE FUNCTION public.enforce_student_homeroom_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  teacher_class text;
  teacher_active boolean;
BEGIN
  IF NEW.homeroom_teacher_id IS NULL THEN RETURN NEW; END IF;
  SELECT homeroom_class, is_active INTO teacher_class, teacher_active
    FROM public.teachers WHERE id = NEW.homeroom_teacher_id FOR UPDATE;
  IF NOT FOUND OR teacher_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'The selected homeroom teacher is unavailable' USING errcode = '23503';
  END IF;
  IF teacher_class IS NULL OR btrim(teacher_class) = '' THEN
    UPDATE public.teachers SET homeroom_class = btrim(NEW.class_name)
      WHERE id = NEW.homeroom_teacher_id;
  ELSIF btrim(teacher_class) <> btrim(NEW.class_name) THEN
    RAISE EXCEPTION 'Student class must match the homeroom teacher class' USING errcode = '23514';
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS students_enforce_homeroom_assignment ON public.students;
CREATE TRIGGER students_enforce_homeroom_assignment
BEFORE INSERT OR UPDATE OF homeroom_teacher_id, class_name ON public.students
FOR EACH ROW EXECUTE FUNCTION public.enforce_student_homeroom_assignment();

NOTIFY pgrst, 'reload schema';