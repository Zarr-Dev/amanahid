import {
    getRequestRole,
    isAllowedOrigin,
    jsonError,
    jsonSupabaseError,
    getSession,
    rateLimit,
    supabaseRequest
} from "./_lib/supabase.js";
import { validateSchema } from "./_lib/validate.js";
import { signToken } from "./_lib/admin-auth.js";
import { writeAuditLog } from "./_lib/audit.js";

const FACE_MATCH_THRESHOLD = 0.45;

export default async function handler(req, res) {
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    let role;
    try {
        role = await getRequestRole(req);
    } catch (error) {
        console.error("Face verification session validation failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate student session");
    }
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }
    if (role !== "siswa") return jsonError(res, 403, "Student role is required");
    if (!rateLimit(req, "face-match:POST:siswa", 20, 60_000, res)) {
        return jsonError(res, 429, "Too many face verification attempts");
    }

    const body = req.body || {};
    const validation = validateSchema({
        nisn: { type: "string", required: true, max: 20, pattern: /^\d{8,20}$/ },
        descriptor: {
            type: "array", required: true, min: 128, max: 128,
            validate: value => typeof value === "number" && Number.isFinite(value)
        }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    const { nisn, descriptor } = body;
    if (typeof nisn !== "string" || !/^\d{8,20}$/.test(nisn) ||
        getSession(req)?.nisn !== nisn) {
        return jsonError(res, 403, "Students can only verify their own face");
    }
    try {
        const rows = await supabaseRequest(
            `students?select=nisn,face_descriptors,is_active&nisn=eq.${encodeURIComponent(nisn)}&limit=1`
        );
        if (!rows.length || !rows[0].is_active) {
            await writeAuditLog(getSession(req), "face.verify", "students", nisn, {
                match: false, registered: false
            });
            return res.status(200).json({ match: false, registered: false });
        }
        const samples = Array.isArray(rows[0].face_descriptors?.[0])
            ? rows[0].face_descriptors
            : [rows[0].face_descriptors];
        const validSamples = samples.filter(sample => Array.isArray(sample) && sample.length === 128 &&
            sample.every(value => typeof value === "number" && Number.isFinite(value)));
        if (!validSamples.length) {
            await writeAuditLog(getSession(req), "face.verify", "students", nisn, {
                match: false, registered: false
            });
            return res.status(200).json({ match: false, registered: false });
        }

        const distance = Math.min(...validSamples.map(sample => Math.sqrt(
            sample.reduce((sum, value, index) => sum + (value - descriptor[index]) ** 2, 0)
        )));
        const match = distance <= FACE_MATCH_THRESHOLD;
        await writeAuditLog(getSession(req), "face.verify", "students", nisn, {
            match, registered: true
        });
        const confidence = Math.max(0, Math.min(1, 1 - distance));
        const proofToken = match
            ? signToken({
                email: getSession(req).email,
                role: "siswa",
                nisn,
                purpose: "attendance_face",
                faceVerified: true,
                confidence
            }, 120_000)
            : null;
        return res.status(200).json({
            match,
            registered: true,
            confidence,
            ...(proofToken ? { proofToken } : {})
        });
    } catch (error) {
        console.error("Student face match failed:", error);
        return jsonSupabaseError(res, error, "Unable to verify student face");
    }
}
