import {
    getRequestRole,
    isAllowedOrigin,
    jsonError,
    jsonSupabaseError,
    rateLimit,
    getSession,
    supabaseRequest,
    verifyTeacherSession
} from "./_lib/supabase.js";
import { hashPassword, validatePassword } from "./_lib/admin-auth.js";
import { writeAuditLog } from "./_lib/audit.js";
import { validateSchema } from "./_lib/validate.js";

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
        let role;
        try {
            role = await getRequestRole(req);
        } catch (error) {
            console.error("Student query authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate student session");
        }
        if (role !== "guru" && role !== "siswa") return jsonError(res, 403, "A valid user role is required");
        const withFaces = req.query?.with_faces === "1";
        const nisn = req.query?.nisn;
        if (role === "siswa" && (!parseNisn(nisn) || getSession(req)?.nisn !== nisn)) {
            return jsonError(res, 403, "Students can only access their own record");
        }
        if (withFaces && role !== "guru" && role !== "admin") {
            return jsonError(res, 403, "Face descriptors are not available for this request");
        }
        try {
            const columns = withFaces ? STUDENT_COLUMNS_WITH_FACES : STUDENT_COLUMNS;
            const filter = parseNisn(nisn) ? `&nisn=eq.${encodeURIComponent(nisn)}` : "";
            const students = await supabaseRequest(
                `students?select=${columns}${filter}&is_active=eq.true&order=name.asc`
            );
            return res.status(200).json({ students });
        } catch (error) {
            console.error("Student query failed:", error);
            return jsonSupabaseError(res, error, "Unable to load students");
        }
    }

    if (req.method === "PATCH") {
        try {
            if (!await verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        } catch (error) {
            console.error("Student face update authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        if (!rateLimit(req, "students:PATCH:faces", 10, 60_000, res)) {
            return jsonError(res, 429, "Too many face update attempts. Try again later.");
        }
        const body = req.body || {};
        const nisn = body.nisn;
        const face_descriptors = body.face_descriptors;
        if (!parseNisn(nisn) || !isValidDescriptors(face_descriptors) ||
            !Array.isArray(face_descriptors) || face_descriptors.length !== 5 ||
            !face_descriptors.every(sample => Array.isArray(sample) && sample.length === 128)) {
            return jsonError(res, 400, "A valid NISN and five face-angle descriptors are required");
        }
        try {
            const students = await supabaseRequest(
                "students?select=id,nisn,name,face_descriptors&nisn=eq." + encodeURIComponent(nisn) + "&is_active=eq.true&limit=1"
            );
            if (!students.length) return jsonError(res, 404, "Student account was not found");
            const otherStudents = await supabaseRequest(
                "students?select=nisn,face_descriptors&is_active=eq.true&limit=1000"
            );
            const duplicateIdentity = otherStudents.some(other => {
                if (other.nisn === nisn || !isValidDescriptors(other.face_descriptors)) return false;
                const samples = Array.isArray(other.face_descriptors[0]) ? other.face_descriptors : [other.face_descriptors];
                return face_descriptors.some(sample => samples.some(otherSample => {
                    let squared = 0;
                    for (let i = 0; i < 128; i++) squared += (sample[i] - otherSample[i]) ** 2;
                    return Math.sqrt(squared) < 0.28;
                }));
            });
            if (duplicateIdentity) return jsonError(res, 409, "These face samples closely match a different student. Verify the identity before replacing the face data.");
            const updated = await supabaseRequest(
                "students?id=eq." + encodeURIComponent(students[0].id) + "&select=id,nisn,name,class_name,parent_whatsapp,face_descriptors,created_at,email",
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({ face_descriptors })
                }
            );
            await writeAuditLog(getSession(req), "student.face_update", "students", students[0].id, { nisn });
            return res.status(200).json({ student: updated[0] });
        } catch (error) {
            console.error("Student face update failed:", error);
            return jsonSupabaseError(res, error, "Unable to update student face data");
        }
    }

    if (req.method === "POST") {
        try {
            if (!await verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        } catch (error) {
            console.error("Student registration authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        if (!rateLimit(req, "students:POST", 10, 60_000, res)) {
            return jsonError(res, 429, "Too many student registrations. Try again in a minute.");
        }
        const body = req.body || {};
        const validation = validateSchema({
            nisn: { type: "string", required: true, max: 20, pattern: /^\d{8,20}$/ },
            name: { type: "string", required: true, max: 120, min: 1 },
            class_name: { type: "string", required: true, max: 40, min: 1 },
            parent_whatsapp: { type: "string", max: 15, pattern: /^(08|628)\d{8,13}$/ },
            email: { type: "string", required: true, max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            password: { type: "string", required: true, max: 128 },
            face_descriptors: {
                type: "array", required: true, min: 1, max: 640,
                validate: item => typeof item === "number" && Number.isFinite(item) ||
                    Array.isArray(item) && item.length === 128 &&
                    item.every(value => typeof value === "number" && Number.isFinite(value))
            }
        }, body);
        if (!validation.valid) return jsonError(res, 400, validation.error);
        const { nisn, name, class_name, parent_whatsapp, face_descriptors, email, password } = body;
        if (!validatePassword(password)) return jsonError(res, 400, "Password must contain 8 to 128 safe characters");
        if (typeof parent_whatsapp === "string" && /[\u0000-\u001F\u007F]/.test(parent_whatsapp)) {
            return jsonError(res, 400, "Invalid parent WhatsApp number");
        }
        if (!parseNisn(nisn)) return jsonError(res, 400, "NISN must contain 8 to 20 digits");
        if (typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
            /[\u0000-\u001F\u007F]/.test(name)) {
            return jsonError(res, 400, "Student name is required");
        }
        if (typeof class_name !== "string" || !class_name.trim() || class_name.trim().length > 40 ||
            /[\u0000-\u001F\u007F]/.test(class_name)) {
            return jsonError(res, 400, "Class name is required");
        }
        if (parent_whatsapp === "") {
            return jsonError(res, 400, "Invalid parent WhatsApp number");
        }
        if (!isValidDescriptors(face_descriptors)) {
            return jsonError(res, 400, "Face descriptors must contain 1 to 5 arrays of 128 finite numbers");
        }

        try {
            const existing = await supabaseRequest(
                `students?select=id,email,face_descriptors&nisn=eq.${encodeURIComponent(nisn)}&limit=1`
            );
            if (existing.length && isValidDescriptors(existing[0].face_descriptors)) {
                return jsonError(res, 409, "A student with this NISN already has registered face samples");
            }
            const registeredStudents = await supabaseRequest(
                "students?select=id,nisn,face_descriptors&is_active=eq.true&limit=1000"
            );
            const submittedSamples = Array.isArray(face_descriptors[0]) ? face_descriptors : [face_descriptors];
            const duplicateIdentity = registeredStudents.some(other => {
                if (other.nisn === nisn || !isValidDescriptors(other.face_descriptors)) return false;
                const otherSamples = Array.isArray(other.face_descriptors[0]) ? other.face_descriptors : [other.face_descriptors];
                return submittedSamples.some(sample => otherSamples.some(otherSample => {
                    let squared = 0;
                    for (let i = 0; i < 128; i++) squared += (sample[i] - otherSample[i]) ** 2;
                    return Math.sqrt(squared) < 0.28;
                }));
            });
            if (duplicateIdentity) {
                return jsonError(res, 409, "These face samples closely match a different registered student. Verify the identity with a teacher before continuing.");
            }
            const teacherEmail = await supabaseRequest(
                `teachers?select=id&email=eq.${encodeURIComponent(email.trim().toLowerCase())}&limit=1`
            );
            if (teacherEmail.length) return jsonError(res, 409, "User email already exists");
            const values = {
                nisn,
                name: name.trim(),
                class_name: class_name.trim(),
                parent_whatsapp: parent_whatsapp || null,
                email: email.trim().toLowerCase(),
                password_hash: await hashPassword(password),
                face_descriptors: Array.isArray(face_descriptors[0])
                    ? face_descriptors
                    : [face_descriptors]
            };
            const query = existing.length
                ? `students?id=eq.${encodeURIComponent(existing[0].id)}&select=id,nisn,name,class_name,parent_whatsapp,face_descriptors,created_at,email`
                : "students?select=id,nisn,name,class_name,parent_whatsapp,face_descriptors,created_at,email";
            const rows = await supabaseRequest(query, {
                method: existing.length ? "PATCH" : "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(values)
            });
            await writeAuditLog(getSession(req), existing.length ? "student.face_register" : "student.create",
                "students", rows[0]?.id, {
                nisn, email: email.trim().toLowerCase(), name: name.trim(), class_name: class_name.trim()
            });
            return res.status(201).json({ student: rows[0] });
        } catch (error) {
            if (error.code === "23505") return jsonError(res, 409, "A student with this NISN already exists");
            console.error("Student insert failed:", error);
            return jsonSupabaseError(res, error, "Unable to save student");
        }
    }

    if (req.method === "DELETE") {
        try {
            if (!await verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        } catch (error) {
            console.error("Student deletion authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        const nisn = req.query?.nisn;
        const deleteAll = req.query?.all === "1";
        if (!deleteAll && !parseNisn(nisn)) return jsonError(res, 400, "A valid NISN is required");
        try {
            const actor = getSession(req);
            const filter = deleteAll ? "" : `?nisn=eq.${encodeURIComponent(nisn)}`;
            const deleted = await supabaseRequest(`students?select=id,nisn${filter}`);
            await supabaseRequest(`students${filter}`, { method: "DELETE" });
            await writeAuditLog(actor, deleteAll ? "student.delete_all" : "student.delete", "students",
                deleteAll ? "all" : nisn, { count: deleted.length });
            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error("Student delete failed:", error);
            return jsonSupabaseError(res, error, "Unable to delete student");
        }
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return jsonError(res, 405, "Method not allowed");
}
