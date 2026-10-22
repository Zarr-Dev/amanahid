import {
    getRequestRole,
    isAllowedOrigin,
    jsonError,
    jsonSupabaseError,
    rateLimit,
    supabaseRequest,
    verifyTeacherSession
} from "../lib/supabase.js";

const STUDENT_COLUMNS = "id,nisn,name,class_name,parent_whatsapp,created_at";
const STUDENT_COLUMNS_WITH_FACES = `${STUDENT_COLUMNS},face_descriptors`;

function isValidDescriptors(descriptors) {
    const samples = Array.isArray(descriptors?.[0]) ? descriptors : [descriptors];
    return samples.length >= 1 && samples.length <= 5 && samples.every(sample =>
        Array.isArray(sample) && sample.length === 128 &&
        sample.every(value => typeof value === "number" && Number.isFinite(value))
    );
}

function parseNisn(value) {
    return typeof value === "string" && /^\d{8,20}$/.test(value);
}

export default async function handler(req, res) {
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");

    if (req.method === "GET") {
        const role = getRequestRole(req);
        if (!role) return jsonError(res, 403, "A valid user role is required");
        const withFaces = req.query?.with_faces === "1";
        const nisn = req.query?.nisn;
        if (role === "siswa" && (!parseNisn(nisn) || req.headers["x-nisn"] !== nisn)) {
            return jsonError(res, 403, "Students can only access their own record");
        }
        if (withFaces && role !== "guru") {
            return jsonError(res, 403, "Face descriptors are not available for this request");
        }
        try {
            const columns = withFaces ? STUDENT_COLUMNS_WITH_FACES : STUDENT_COLUMNS;
            const filter = parseNisn(nisn) ? `&nisn=eq.${encodeURIComponent(nisn)}` : "";
            const students = await supabaseRequest(`students?select=${columns}${filter}&order=name.asc`);
            return res.status(200).json({ students });
        } catch (error) {
            console.error("Student query failed:", error);
            return jsonSupabaseError(res, error, "Unable to load students");
        }
    }

    if (req.method === "POST") {
        if (!verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        if (!rateLimit(req, "students:POST", 10, 60_000)) {
            return jsonError(res, 429, "Too many student registrations. Try again in a minute.");
        }
        const { nisn, name, class_name, parent_whatsapp, face_descriptors } = req.body || {};
        if (!parseNisn(nisn)) return jsonError(res, 400, "NISN must contain 8 to 20 digits");
        if (typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
            /[\u0000-\u001F\u007F]/.test(name)) {
            return jsonError(res, 400, "Student name is required");
        }
        if (typeof class_name !== "string" || !class_name.trim() || class_name.trim().length > 40 ||
            /[\u0000-\u001F\u007F]/.test(class_name)) {
            return jsonError(res, 400, "Class name is required");
        }
        if (parent_whatsapp !== undefined && parent_whatsapp !== null && parent_whatsapp !== "" &&
            (typeof parent_whatsapp !== "string" || !/^(08|628)\d{8,13}$/.test(parent_whatsapp))) {
            return jsonError(res, 400, "Invalid parent WhatsApp number");
        }
        if (!isValidDescriptors(face_descriptors)) {
            return jsonError(res, 400, "Face descriptors must contain 1 to 5 arrays of 128 finite numbers");
        }

        try {
            const existing = await supabaseRequest(`students?select=id&nisn=eq.${encodeURIComponent(nisn)}&limit=1`);
            if (existing.length) return jsonError(res, 409, "A student with this NISN already exists");

            const rows = await supabaseRequest("students?select=id,nisn,name,class_name,parent_whatsapp,face_descriptors,created_at", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    nisn,
                    name: name.trim(),
                    class_name: class_name.trim(),
                    parent_whatsapp: parent_whatsapp || null,
                    face_descriptors: Array.isArray(face_descriptors[0]) ? face_descriptors : [face_descriptors]
                })
            });
            return res.status(201).json({ student: rows[0] });
        } catch (error) {
            if (error.code === "23505") return jsonError(res, 409, "A student with this NISN already exists");
            console.error("Student insert failed:", error);
            return jsonSupabaseError(res, error, "Unable to save student");
        }
    }

    if (req.method === "DELETE") {
        if (!verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        const nisn = req.query?.nisn;
        const deleteAll = req.query?.all === "1";
        if (!deleteAll && !parseNisn(nisn)) return jsonError(res, 400, "A valid NISN is required");
        try {
            const filter = deleteAll ? "" : `?nisn=eq.${encodeURIComponent(nisn)}`;
            await supabaseRequest(`students${filter}`, { method: "DELETE" });
            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error("Student delete failed:", error);
            return jsonSupabaseError(res, error, "Unable to delete student");
        }
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return jsonError(res, 405, "Method not allowed");
}
