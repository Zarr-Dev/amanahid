-- Amanah ID: isolated ArcFace 512D biometric templates.
-- Model provenance: AuraFace-v1 INT8, Apache-2.0, from Dao-Dung/auraface-v1-int8.
-- This migration is additive. Existing 128D face_descriptors remain untouched.
-- Apply only after the school has approved biometric processing and obtained
-- the required parent/guardian and student notices/consents.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.student_face_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    model_key text NOT NULL,
    sample_angle text NOT NULL CHECK (sample_angle IN ('front', 'left', 'right', 'up', 'down')),
    embedding extensions.vector(512) NOT NULL,
    quality real NOT NULL CHECK (quality >= 0.70 AND quality <= 1.00),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT student_face_embeddings_student_model_angle_uq
        UNIQUE (student_id, model_key, sample_angle)
);

ALTER TABLE private.student_face_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.student_face_embeddings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.student_face_embeddings TO service_role;

CREATE INDEX IF NOT EXISTS student_face_embeddings_model_student_idx
    ON private.student_face_embeddings (model_key, student_id);

CREATE INDEX IF NOT EXISTS student_face_embeddings_embedding_hnsw_idx
    ON private.student_face_embeddings
    USING hnsw (embedding extensions.vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE private.student_face_embeddings IS
    'Private biometric embeddings for Amanah ID. Templates are model-versioned, 512D ArcFace vectors; do not expose through public Data API or student roster endpoints.';

CREATE OR REPLACE FUNCTION public.replace_student_face_embeddings(
    p_student_id uuid,
    p_model_key text,
    p_samples jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private, extensions
AS $function$
DECLARE
    v_sample jsonb;
    v_embedding extensions.vector(512);
    v_count integer := 0;
    v_angle text;
    v_quality real;
BEGIN
    IF p_student_id IS NULL THEN
        RAISE EXCEPTION 'student_id is required' USING ERRCODE = '22023';
    END IF;
    IF p_model_key IS DISTINCT FROM 'auraface-glintr100-int8-v1' THEN
        RAISE EXCEPTION 'unsupported face model key' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(p_samples) IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_samples) <> 5 THEN
        RAISE EXCEPTION 'exactly five face samples are required' USING ERRCODE = '22023';
    END IF;

    IF (
        SELECT count(DISTINCT item->>'sample_angle')
        FROM jsonb_array_elements(p_samples) AS item
        WHERE item->>'sample_angle' IN ('front', 'left', 'right', 'up', 'down')
    ) <> 5 THEN
        RAISE EXCEPTION 'five unique face angles are required' USING ERRCODE = '22023';
    END IF;

    -- Validate all samples before replacing any prior template.
    FOR v_sample IN SELECT value FROM jsonb_array_elements(p_samples)
    LOOP
        v_angle := v_sample->>'sample_angle';
        IF v_angle NOT IN ('front', 'left', 'right', 'up', 'down') THEN
            RAISE EXCEPTION 'invalid face sample angle' USING ERRCODE = '22023';
        END IF;
        IF jsonb_typeof(v_sample->'embedding') IS DISTINCT FROM 'array'
           OR jsonb_array_length(v_sample->'embedding') <> 512 THEN
            RAISE EXCEPTION 'face embedding must contain 512 numeric values' USING ERRCODE = '22023';
        END IF;
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_sample->'embedding') AS component
            WHERE jsonb_typeof(component) IS DISTINCT FROM 'number'
               OR abs((component #>> '{}')::double precision) > 10
        ) THEN
            RAISE EXCEPTION 'face embedding contains invalid numeric values' USING ERRCODE = '22023';
        END IF;
        v_quality := (v_sample->>'quality')::real;
        IF v_quality < 0.70 OR v_quality > 1.00 THEN
            RAISE EXCEPTION 'face sample quality is outside the allowed range' USING ERRCODE = '22023';
        END IF;
        v_embedding := (v_sample->'embedding')::text::extensions.vector;
        IF extensions.vector_dims(v_embedding) <> 512 THEN
            RAISE EXCEPTION 'face embedding dimension mismatch' USING ERRCODE = '22023';
        END IF;
    END LOOP;

    DELETE FROM private.student_face_embeddings
    WHERE student_id = p_student_id AND model_key = p_model_key;

    FOR v_sample IN SELECT value FROM jsonb_array_elements(p_samples)
    LOOP
        INSERT INTO private.student_face_embeddings (
            student_id, model_key, sample_angle, embedding, quality
        )
        VALUES (
            p_student_id,
            p_model_key,
            v_sample->>'sample_angle',
            (v_sample->'embedding')::text::extensions.vector,
            (v_sample->>'quality')::real
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_student_face_embeddings(
    p_model_key text,
    p_query_embeddings jsonb,
    p_teacher_id uuid DEFAULT NULL,
    p_student_id uuid DEFAULT NULL,
    p_exclude_student_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 2
)
RETURNS TABLE (
    student_id uuid,
    nisn text,
    name text,
    distance real
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private, extensions
AS $function$
BEGIN
    IF p_model_key IS DISTINCT FROM 'auraface-glintr100-int8-v1' THEN
        RAISE EXCEPTION 'unsupported face model key' USING ERRCODE = '22023';
    END IF;
    IF p_teacher_id IS NOT NULL AND p_student_id IS NOT NULL THEN
        RAISE EXCEPTION 'teacher and student scope cannot be combined' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(p_query_embeddings) IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_query_embeddings) < 1
       OR jsonb_array_length(p_query_embeddings) > 5 THEN
        RAISE EXCEPTION 'one to five query embeddings are required' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_query_embeddings) AS item
        WHERE jsonb_typeof(item->'embedding') IS DISTINCT FROM 'array'
           OR jsonb_array_length(item->'embedding') <> 512
           OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(item->'embedding') AS component
                WHERE jsonb_typeof(component) IS DISTINCT FROM 'number'
                   OR abs((component #>> '{}')::double precision) > 10
           )
    ) THEN
        RAISE EXCEPTION 'query embedding must contain 512 finite numeric values' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    WITH query_vectors AS (
        SELECT (item->'embedding')::text::extensions.vector AS embedding
        FROM jsonb_array_elements(p_query_embeddings) AS item
    ),
    ranked AS (
        SELECT
            student.id AS matched_student_id,
            student.nisn AS matched_nisn,
            student.name AS matched_name,
            min(template.embedding <=> query.embedding) AS best_distance
        FROM private.student_face_embeddings AS template
        JOIN public.students AS student ON student.id = template.student_id
        CROSS JOIN query_vectors AS query
        WHERE template.model_key = p_model_key
          AND student.is_active = true
          AND (p_teacher_id IS NULL OR student.homeroom_teacher_id = p_teacher_id)
          AND (p_student_id IS NULL OR student.id = p_student_id)
          AND (p_exclude_student_id IS NULL OR student.id <> p_exclude_student_id)
        GROUP BY student.id, student.nisn, student.name
    )
    SELECT
        ranked.matched_student_id,
        ranked.matched_nisn,
        ranked.matched_name,
        ranked.best_distance::real
    FROM ranked
    ORDER BY ranked.best_distance ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 2), 1), 5);
END;
$function$;

REVOKE ALL ON FUNCTION public.replace_student_face_embeddings(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_student_face_embeddings(text, jsonb, uuid, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_student_face_embeddings(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_student_face_embeddings(text, jsonb, uuid, uuid, uuid, integer) TO service_role;
