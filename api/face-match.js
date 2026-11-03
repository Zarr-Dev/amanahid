import {
    getRequestRole, isAllowedOrigin, jsonError, jsonSupabaseError,
    getSession, rateLimit, supabaseRequest
} from "./_lib/supabase.js";
import { validateSchema } from "./_lib/validate.js";
import { signToken } from "./_lib/admin-auth.js";
import { writeAuditLog } from "./_lib/audit.js";

const FACE_MODEL_KEY = "auraface-glintr100-int8-v1";
const FACE_EMBEDDING_DIMENSIONS = 512;
// Conservative starting point only. Calibrate against consented, representative
// school-device samples before enabling real attendance decisions.
const FACE_MATCH_COSINE_DISTANCE_THRESHOLD = 0.32;
const FACE_AMBIGUITY_MARGIN = 0.035;

function normalizeIncomingEmbedding(values) {
    if (!Array.isArray(values) || values.length !== FACE_EMBEDDING_DIMENSIONS ||
        !values.every(value => typeof value === "number" && Number.isFinite(value))) {
        return null;
    }
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    if (!Number.isFinite(norm) || norm < 0.98 || norm > 1.02) return null;
    return values.map(value => value / norm);
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }

    let role;
    try {
        role = await getRequestRole(req);
    } catch (error) {
        console.error("Face verification session validation failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate session");
    }
    if (role !== "siswa" && role !== "guru") {
        return jsonError(res, 403, "Student or teacher role is required");
    }
    if (!rateLimit(req, "face-match:POST:" + role, role === "guru" ? 30 : 20, 60_000, res)) {
        return jsonError(res, 429, "Too many face verification attempts");
    }

    const body = req.body || {};
    const validation = validateSchema({
        model_key: { type: "string", required: true, max: 80, min: 1 },
        embedding: {
            type: "array",
            required: true,
            min: FACE_EMBEDDING_DIMENSIONS,
            max: FACE_EMBEDDING_DIMENSIONS,
            validate: value => typeof value === "number" && Number.isFinite(value)
        }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    if (body.model_key !== FACE_MODEL_KEY) {
        return jsonError(res, 409, "Face model version mismatch. Re-enroll the student with the current model.");
    }
    const embedding = normalizeIncomingEmbedding(body.embedding);
    if (!embedding) {
        return jsonError(res, 400, "A normalized 512-dimensional face embedding is required");
    }

    const session = getSession(req);
    let studentId = null;
    let teacherId = null;
    let expectedNisn = null;

    try {
        if (role === "siswa") {
            if (!session?.nisn) return jsonError(res, 403, "A valid student session is required");
            const rows = await supabaseRequest(
                "students?select=id,nisn,name,is_active&nisn=eq." +
                encodeURIComponent(session.nisn) + "&is_active=eq.true&limit=1"
            );
            const ownStudent = rows?.[0];
            if (!ownStudent || ownStudent.nisn !== session.nisn) {
                return jsonError(res, 403, "An active student account is required");
            }
            studentId = ownStudent.id;
            expectedNisn = ownStudent.nisn;
        } else {
            const teacherRows = await supabaseRequest(
                "teachers?select=id&email=eq." +
                encodeURIComponent(session?.email || "") + "&is_active=eq.true&limit=1"
            );
            const teacher = teacherRows?.[0];
            if (!teacher) return jsonError(res, 403, "An active teacher account is required");
            teacherId = teacher.id;
        }

        // Embeddings never leave the private schema. The database performs the
        // similarity search and returns only candidate identity + distance.
        const ranked = await supabaseRequest("rpc/match_student_face_embeddings", {
            method: "POST",
            body: JSON.stringify({
                p_model_key: FACE_MODEL_KEY,
                p_query_embeddings: [{ embedding }],
                p_teacher_id: teacherId,
                p_student_id: studentId,
                p_exclude_student_id: null,
                p_limit: 2
            })
        });

        const candidates = Array.isArray(ranked) ? ranked
            .filter(row => typeof row?.student_id === "string" &&
                typeof row?.nisn === "string" &&
                typeof row?.distance === "number" &&
                Number.isFinite(row.distance) &&
                row.distance >= 0 && row.distance <= 2) : [];
        if (!candidates.length) {
            await writeAuditLog(session, "face.verify", "students", studentId || teacherId || "none", {
                match: false, registered: false, role, model_key: FACE_MODEL_KEY
            });
            return res.status(200).json({ match: false, registered: false, model_key: FACE_MODEL_KEY });
        }

        const best = candidates[0];
        const second = candidates[1] || null;
        const ambiguous = Boolean(
            role === "guru" &&
            best.distance <= FACE_MATCH_COSINE_DISTANCE_THRESHOLD &&
            second &&
            second.distance <= FACE_MATCH_COSINE_DISTANCE_THRESHOLD &&
            second.distance - best.distance <= FACE_AMBIGUITY_MARGIN
        );
        const match = Boolean(
            best.distance <= FACE_MATCH_COSINE_DISTANCE_THRESHOLD &&
            !ambiguous &&
            (role !== "siswa" || best.student_id === studentId)
        );
        const similarity = Math.max(0, Math.min(1, 1 - best.distance));
        const matchedNisn = match ? best.nisn : null;

        await writeAuditLog(session, "face.verify", "students", matchedNisn || (role === "siswa" ? expectedNisn : "unknown"), {
            match,
            registered: true,
            role,
            ambiguous,
            model_key: FACE_MODEL_KEY,
            nearest_distance: Number(best.distance.toFixed(5)),
            runner_up_distance: Number.isFinite(second?.distance) ? Number(second.distance.toFixed(5)) : null
        });

        const proofToken = match
            ? signToken({
                email: session.email,
                role,
                nisn: matchedNisn,
                purpose: "attendance_face",
                faceVerified: true,
                faceModel: FACE_MODEL_KEY,
                confidence: similarity
            }, 120_000)
            : null;

        return res.status(200).json({
            match,
            registered: true,
            confidence: similarity,
            model_key: FACE_MODEL_KEY,
            ...(ambiguous ? { ambiguous: true } : {}),
            ...(match ? { nisn: matchedNisn, name: best.name, proofToken } : {})
        });
    } catch (error) {
        console.error("Face verification failed:", error);
        return jsonSupabaseError(res, error, "Unable to verify face");
    }
}
