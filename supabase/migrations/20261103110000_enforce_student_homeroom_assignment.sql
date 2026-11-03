-- Apply only after the application release that writes homeroom_teacher_id
-- is serving production. Existing student rows remain untouched until Admin maps them.

CREATE OR REPLACE FUNCTION public.enforce_student_homeroom_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  teacher_class text;
  teacher_active boolean;
BEGIN
  IF NEW.homeroom_teacher_id IS NULL THEN
    RAISE EXCEPTION 'A homeroom teacher must be assigned to every new or reassigned student'
      USING errcode = '23514';
  END IF;

  SELECT homeroom_class, is_active
    INTO teacher_class, teacher_active
    FROM public.teachers
    WHERE id = NEW.homeroom_teacher_id
    FOR UPDATE;

  IF NOT FOUND OR teacher_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'The selected homeroom teacher is unavailable'
      USING errcode = '23503';
  END IF;

  IF teacher_class IS NULL OR btrim(teacher_class) = '' THEN
    UPDATE public.teachers
      SET homeroom_class = btrim(NEW.class_name)
      WHERE id = NEW.homeroom_teacher_id;
  ELSIF btrim(teacher_class) <> btrim(NEW.class_name) THEN
    RAISE EXCEPTION 'Student class must match the homeroom teacher class'
      USING errcode = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_enforce_homeroom_assignment ON public.students;
CREATE TRIGGER students_enforce_homeroom_assignment
BEFORE INSERT OR UPDATE OF homeroom_teacher_id, class_name ON public.students
FOR EACH ROW EXECUTE FUNCTION public.enforce_student_homeroom_assignment();
