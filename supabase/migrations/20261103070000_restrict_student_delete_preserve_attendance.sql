-- Preserve attendance history if an account is deactivated or a privileged
-- maintenance task attempts to remove a student row. Application-level hard
-- deletion is already disabled; this protects the database boundary as well.
ALTER TABLE public.attendance
    DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;

ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_student_id_fkey
    FOREIGN KEY (student_id)
    REFERENCES public.students(id)
    ON DELETE RESTRICT;
