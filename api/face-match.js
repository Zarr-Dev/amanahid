import {
    getRequestRole,
    isAllowedOrigin,
    jsonError,
    jsonSupabaseError,
    supabaseRequest
} from "../lib/supabase.js";

const FACE_MATCH_THRESHOLD = 0.45;

export default async function handler(req, res) {
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    const role = getRequestRole(req);
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }
    if (role !== "siswa") return jsonError(res, 403, "Student role is required");

    const { nisn, descriptor } = req.body || {};
    if (typeof nisn !== "string" || !/^\d{8,20}$/.test(nisn) ||
        req.headers["x-nisn"] !== nisn) {
        return jsonError(res, 403, "Students can only verify their own face");
    }
    if (!Array.isArray(descriptor) || descriptor.length !== 128 ||
        !descriptor.every(value => typeof value === "number" && Number.isFinite(value))) {
        return jsonError(res, 400, "A valid 128-value face descriptor is required");
    }

    try {
        const rows = await supabaseRequest(
            `students?select=nisn,face_descriptors&nisn=eq.${encodeURIComponent(nisn)}&limit=1`
        );
        if (!rows.length) return res.status(200).json({ match: false, registered: false });
        const samples = Array.isArray(rows[0].face_descriptors?.[0])
            ? rows[0].face_descriptors
            : [rows[0].face_descriptors];
        const validSamples = samples.filter(sample => Array.isArray(sample) && sample.length === 128 &&
            sample.every(value => typeof value === "number" && Number.isFinite(value)));
        if (!validSamples.length) return res.status(200).json({ match: false, registered: false });

        const distance = Math.min(...validSamples.map(sample => Math.sqrt(
            sample.reduce((sum, value, index) => sum + (value - descriptor[index]) ** 2, 0)
        )));
        const match = distance <= FACE_MATCH_THRESHOLD;
        return res.status(200).json({
            match,
            registered: true,
            confidence: Math.max(0, Math.min(1, 1 - distance))
        });
    } catch (error) {
        console.error("Student face match failed:", error);
        return jsonSupabaseError(res, error, "Unable to verify student face");
    }
}
