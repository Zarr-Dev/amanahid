import {
    getRequestRole, isAllowedOrigin, jsonError, jsonSupabaseError,
    getSession, rateLimit, supabaseRequest
} from "./_lib/supabase.js";
import { validateSchema } from "./_lib/validate.js";
import { signToken } from "./_lib/admin-auth.js";
import { writeAuditLog } from "./_lib/audit.js";

const FACE_MATCH_THRESHOLD = 0.45;
const DESCRIPTOR_LENGTH = 128;

function validSamples(value) {
    const samples = Array.isArray(value?.[0]) ? value : [value];
    return samples.filter(sample => Array.isArray(sample) && sample.length === DESCRIPTOR_LENGTH &&
        sample.every(item => typeof item === "number" && Number.isFinite(item)));
}

function descriptorDistance(a, b) {
    return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
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
    if (role !== "siswa" && role !== "guru") return jsonError(res, 403, "Student or teacher role is required");
    if (!rateLimit(req, `face-match:POST:${role}`, role === "guru" ? 30 : 20, 60_000, res)) {
        return jsonError(res, 429, "Too many face verification attempts");
    }

    const body = req.body || {};
    const validation = validateSchema({
        nisn: { type: "string", max: 20, pattern: /^\\d{8,20}$/ },
        descriptor: {
            type: "array", required: true, min: DESCRIPTOR_LENGTH, max: DESCRIPTOR_LENGTH,
            validate: value => typeof value === "number" && Number.isFinite(value)
        }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    const session = getSession(req);
    const { descriptor } = body;
    if (role === "siswa" && (typeof body.nisn !== "string" || body.nisn !== session?.nisn)) {
        return jsonError(res, 403, "Students can only verify their own face");
    }

    try {
        let students;
        if (role === "siswa") {
            students = await supabaseRequest(
                `students?select=nisn,name,face_descriptors,is_active&nisn=eq.${encodeURIComponent(session.nisn)}&limit=1`
            );
        } else {
            students = await supabaseRequest(
                "students?select=nisn,name,face_descriptors,is_active&is_active=eq.true&limit=1000",
                { headers: { Range: "0-999" } }
            );
        }
        const candidates = (Array.isArray(students) ? students : []).filter(student => student?.is_active)
            .flatMap(student => validSamples(student.face_descriptors).map(sample => ({ student, sample })));
        if (!candidates.length) {
            await writeAuditLog(session, "face.verify", "students", role === "siswa" ? session.nisn : "none", {
                match: false, registered: false, role
            });
            return res.status(200).json({ match: false, registered: false });
        }

        let best = null;
        for (const candidate of candidates) {
            const distance = descriptorDistance(candidate.sample, descriptor);
            if (!best || distance < best.distance) best = { ...candidate, distance };
        }
        const match = Boolean(best && best.distance <= FACE_MATCH_THRESHOLD);
        const matchedNisn = match ? best.student.nisn : null;
        const confidence = best ? Math.max(0, Math.min(1, 1 - best.distance)) : 0;
        await writeAuditLog(session, "face.verify", "students", matchedNisn || (role === "siswa" ? session.nisn : "unknown"), {
            match, registered: true, role
        });
        const proofToken = match
            ? signToken({
                email: session.email, role, nisn: matchedNisn,
                purpose: "attendance_face", faceVerified: true, confidence
            }, 120_000)
            : null;
        return res.status(200).json({
            match, registered: true, confidence,
            ...(match ? { nisn: matchedNisn, name: best.student.name, proofToken } : {})
        });
    } catch (error) {
        console.error("Face verification failed:", error);
        return jsonSupabaseError(res, error, "Unable to verify face");
    }
}
