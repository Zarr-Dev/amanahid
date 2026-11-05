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
import { getFeatureFlags, featureDisabled } from "./_lib/features.js";

const STUDENT_COLUMNS = "id,nisn,name,class_name,parent_whatsapp,created_at,homeroom_teacher_id,homeroom_teacher:teachers!students_homeroom_teacher_id_fkey(name,email)";

const FACE_MODEL_KEY = "auraface-glintr100-int8-v1";
const FACE_SAMPLE_ANGLES = new Set(["front", "left", "right", "up", "down"]);
const FACE_EMBEDDING_DIMENSIONS = 512;

function normalizeFaceEmbeddings(samples, modelKey) {
    if (modelKey !== FACE_MODEL_KEY || !Array.isArray(samples) || samples.length !== 5) return null;
    const seenAngles = new Set();
    const normalized = [];
    for (const sample of samples) {
        if (!sample || !FACE_SAMPLE_ANGLES.has(sample.sample_angle) ||
            seenAngles.has(sample.sample_angle) ||
            typeof sample.quality !== "number" || !Number.isFinite(sample.quality) ||
            sample.quality < 0.70 || sample.quality > 1 ||
            !Array.isArray(sample.embedding) || sample.embedding.length !== FACE_EMBEDDING_DIMENSIONS ||
            !sample.embedding.every(value => typeof value === "number" && Number.isFinite(value))) {
            return null;
        }
        const norm = Math.sqrt(sample.embedding.reduce((sum, value) => sum + value * value, 0));
        if (!Number.isFinite(norm) || norm < 0.98 || norm > 1.02) return null;
        seenAngles.add(sample.sample_angle);
        normalized.push({
            sample_angle: sample.sample_angle,
            quality: sample.quality,
            embedding: sample.embedding.map(value => value / norm)
        });
    }
    return seenAngles.size === 5 ? normalized : null;
}

async function replaceFaceEmbeddings(studentId, samples) {
    const result = await supabaseRequest("rpc/replace_student_face_embeddings", {
        method: "POST",
        body: JSON.stringify({
            p_student_id: studentId,
            p_model_key: FACE_MODEL_KEY,
            p_samples: samples
        })
    });
    const count = Number(Array.isArray(result) ? result[0] : result);
    if (count !== 5) throw new Error("Database did not confirm all five ArcFace templates");
    return count;
}

function parseNisn(value) {
    return typeof value === "string" && /^\d{8,20}$/.test(value);
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    if (req.method === "DELETE") {
        res.setHeader("Allow", "GET, PATCH, POST");
        return jsonError(res, 403, "Student records are managed through Admin account deactivation; permanent deletion is disabled.");
    }

    if (req.method === "GET") {
        let role;
        try {
            role = await getRequestRole(req);
        } catch (error) {
            console.error("Student query authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate student session");
        }
        if (role !== "guru" && role !== "siswa") return jsonError(res, 403, "A valid user role is required");
        const nisn = req.query?.nisn;
        if (role === "siswa" && (!parseNisn(nisn) || getSession(req)?.nisn !== nisn)) {
            return jsonError(res, 403, "Students can only access their own record");
        }
        try {
            let homeroomFilter = "";
            if (role === "guru") {
                const teacherRows = await supabaseRequest(
                    "teachers?select=id&email=eq." + encodeURIComponent(getSession(req)?.email || "") + "&is_active=eq.true&limit=1"
                );
                const teacher = teacherRows?.[0];
                if (!teacher) return jsonError(res, 403, "An active teacher account is required");
                homeroomFilter = "&homeroom_teacher_id=eq." + encodeURIComponent(teacher.id);
            }
            const filter = parseNisn(nisn) ? `&nisn=eq.${encodeURIComponent(nisn)}` : "";
            const students = await supabaseRequest(
                `students?select=${STUDENT_COLUMNS}${filter}${homeroomFilter}&is_active=eq.true&order=name.asc`
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
            console.error("Student PATCH authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }

        const body = req.body || {};
        if (body.action === "deactivate") {
            if (!rateLimit(req, "students:PATCH:deactivate", 12, 60_000, res)) {
                return jsonError(res, 429, "Terlalu banyak perubahan status akun. Coba lagi sebentar.");
            }
            try {
                const features = await getFeatureFlags();
                if (!features.account_deactivation) {
                    return featureDisabled(res, "account_deactivation", "Penonaktifan akun sedang dinonaktifkan");
                }
                if (!parseNisn(body.nisn)) return jsonError(res, 400, "NISN siswa tidak valid");

                const teacherRows = await supabaseRequest(
                    "teachers?select=id,email&email=eq." + encodeURIComponent(getSession(req)?.email || "") +
                    "&is_active=eq.true&limit=1"
                );
                const teacher = teacherRows?.[0];
                if (!teacher) return jsonError(res, 403, "Akun Guru aktif diperlukan");

                const students = await supabaseRequest(
                    "students?select=id,nisn,email,is_active,homeroom_teacher_id&nisn=eq." +
                    encodeURIComponent(body.nisn) + "&is_active=eq.true&limit=1"
                );
                const student = students?.[0];
                if (!student || student.homeroom_teacher_id !== teacher.id) {
                    return jsonError(res, 404, "Siswa tidak ditemukan pada kelas binaan Guru ini");
                }

                const updated = await supabaseRequest(
                    "students?id=eq." + encodeURIComponent(student.id) + "&select=id,nisn,email,is_active",
                    {
                        method: "PATCH",
                        headers: { Prefer: "return=representation" },
                        body: JSON.stringify({ is_active: false })
                    }
                );
                const result = Array.isArray(updated) ? updated[0] : null;
                if (!result) return jsonError(res, 409, "Status siswa tidak berhasil diubah");

                await writeAuditLog(getSession(req), "student.deactivate_by_homeroom_teacher",
                    "students", student.id, {
                        nisn: student.nisn,
                        account_email: student.email,
                        is_active: false
                    });
                return res.status(200).json({ ok: true, is_active: false, nisn: student.nisn });
            } catch (error) {
                console.error("Teacher student deactivation failed:", error);
                return jsonSupabaseError(res, error, "Tidak dapat menonaktifkan akun siswa");
            }
        }

        if (!rateLimit(req, "students:PATCH:faces", 10, 60_000, res)) {
            return jsonError(res, 429, "Too many face update attempts. Try again later.");
        }
        let features;
        try {
            features = await getFeatureFlags();
        } catch (error) {
            console.error("Student face enrollment policy failed:", error);
            return jsonSupabaseError(res, error, "Unable to load student face-enrollment policy");
        }
        if (!features.face_enrollment) {
            return featureDisabled(res, "face_enrollment", "Pendaftaran wajah sedang dinonaktifkan");
        }

        const nisn = body.nisn;
        const faceEmbeddings = normalizeFaceEmbeddings(body.face_embeddings, body.model_key);
        if (!parseNisn(nisn) || !faceEmbeddings) {
            return jsonError(res, 400, "A valid NISN and five normalized 512D ArcFace embeddings are required");
        }
        try {
            const teacherRows = await supabaseRequest(
                "teachers?select=id&email=eq." + encodeURIComponent(getSession(req)?.email || "") +
                "&is_active=eq.true&limit=1"
            );
            const teacher = teacherRows?.[0];
            if (!teacher) return jsonError(res, 403, "An active teacher account is required");
            const students = await supabaseRequest(
                "students?select=id,nisn,name,homeroom_teacher_id&nisn=eq." +
                encodeURIComponent(nisn) + "&is_active=eq.true&limit=1"
            );
            if (!students.length || students[0].homeroom_teacher_id !== teacher.id) {
                return jsonError(res, 404, "Student was not found in your homeroom");
            }

            // The private RPC atomically replaces all five templates. Legacy
            // 128D descriptors are cleared only after the new set is stored.
            await replaceFaceEmbeddings(students[0].id, faceEmbeddings);
            const updated = await supabaseRequest(
                "students?id=eq." + encodeURIComponent(students[0].id) +
                "&select=id,nisn,name,class_name,parent_whatsapp,created_at,email,homeroom_teacher_id,homeroom_teacher:teachers!students_homeroom_teacher_id_fkey(name,email)",
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({ face_descriptors: [] })
                }
            );
            await writeAuditLog(getSession(req), "student.face_update_v2", "students", students[0].id, {
                nisn,
                model_key: FACE_MODEL_KEY,
                sample_count: faceEmbeddings.length,
                dimensions: FACE_EMBEDDING_DIMENSIONS
            });
            return res.status(200).json({
                student: updated[0],
                face_model: FACE_MODEL_KEY,
                embedding_dimensions: FACE_EMBEDDING_DIMENSIONS
            });
        } catch (error) {
            console.error("Student ArcFace update failed:", error);
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
        const features = await getFeatureFlags();
        if (!features.student_account_creation) return featureDisabled(res, "student_account_creation", "Pembuatan akun Siswa sedang dinonaktifkan");
        if (!features.face_enrollment) return featureDisabled(res, "face_enrollment", "Pendaftaran wajah sedang dinonaktifkan");
        const body = req.body || {};
        const validation = validateSchema({
            nisn: { type: "string", required: true, max: 20, pattern: /^\d{8,20}$/ },
            name: { type: "string", required: true, max: 120, min: 1 },
            class_name: { type: "string", required: true, max: 40, min: 1 },
            parent_whatsapp: { type: "string", max: 15, pattern: /^(08|628)\d{8,13}$/ },
            email: { type: "string", required: true, max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            password: { type: "string", required: true, max: 128 },
            model_key: { type: "string", required: true, max: 80, min: 1 },
            face_embeddings: { type: "array", required: true, min: 5, max: 5 }
        }, body);
        if (!validation.valid) return jsonError(res, 400, validation.error);
        const { nisn, name, class_name, parent_whatsapp, email, password } = body;
        const faceEmbeddings = normalizeFaceEmbeddings(body.face_embeddings, body.model_key);
        if (!faceEmbeddings) {
            return jsonError(res, 400, "Five unique angle samples with normalized 512D ArcFace embeddings are required");
        }
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

        let newlyCreatedStudentId = null;
        try {
            const existing = await supabaseRequest(
                "students?select=id,email,face_descriptors&nisn=eq." + encodeURIComponent(nisn) + "&limit=1"
            );
            if (existing.length && Array.isArray(existing[0].face_descriptors) && existing[0].face_descriptors.length > 0) {
                return jsonError(res, 409, "This student has legacy face data. Use the face replacement workflow to migrate to ArcFace.");
            }
            if (existing.length) {
                const hasCurrentTemplates = await supabaseRequest("rpc/has_student_face_embeddings", {
                    method: "POST",
                    body: JSON.stringify({
                        p_student_id: existing[0].id,
                        p_model_key: FACE_MODEL_KEY
                    })
                });
                if (hasCurrentTemplates === true) {
                    return jsonError(res, 409, "This student already has ArcFace templates. Use the face replacement workflow instead of creating the account again.");
                }
            }

            const normalizedEmail = email.trim().toLowerCase();
            const [teacherEmail, adminEmail] = await Promise.all([
                supabaseRequest("teachers?select=id&email=eq." + encodeURIComponent(normalizedEmail) + "&limit=1"),
                supabaseRequest("admin_users?select=id&email=eq." + encodeURIComponent(normalizedEmail) + "&limit=1")
            ]);
            if (teacherEmail.length || adminEmail.length) return jsonError(res, 409, "User email already exists");
            const teacherRows = await supabaseRequest(
                "teachers?select=id,homeroom_class&email=eq." +
                encodeURIComponent(getSession(req)?.email || "") + "&is_active=eq.true&limit=1"
            );
            const assignedTeacher = teacherRows?.[0];
            if (!assignedTeacher) return jsonError(res, 403, "An active teacher account is required to register a student");
            if (assignedTeacher.homeroom_class && assignedTeacher.homeroom_class.trim() !== class_name.trim()) {
                return jsonError(res, 403, "You can only register students in your assigned homeroom class");
            }

            const values = {
                nisn,
                name: name.trim(),
                class_name: class_name.trim(),
                homeroom_teacher_id: assignedTeacher.id,
                parent_whatsapp: parent_whatsapp || null,
                email: normalizedEmail,
                password_hash: await hashPassword(password),
                // Required legacy column remains empty; current face templates are private pgvector rows.
                face_descriptors: existing.length ? existing[0].face_descriptors : []
            };
            const query = existing.length
                ? "students?id=eq." + encodeURIComponent(existing[0].id) +
                    "&select=id,nisn,name,class_name,parent_whatsapp,created_at,email,homeroom_teacher_id,homeroom_teacher:teachers!students_homeroom_teacher_id_fkey(name,email)"
                : "students?select=id,nisn,name,class_name,parent_whatsapp,created_at,email,homeroom_teacher_id,homeroom_teacher:teachers!students_homeroom_teacher_id_fkey(name,email)";
            const rows = await supabaseRequest(query, {
                method: existing.length ? "PATCH" : "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(values)
            });
            const savedStudent = rows?.[0];
            if (!savedStudent?.id) throw new Error("Student account was not returned by the database");
            if (!existing.length) newlyCreatedStudentId = savedStudent.id;

            await replaceFaceEmbeddings(savedStudent.id, faceEmbeddings);
            await writeAuditLog(getSession(req), existing.length ? "student.face_register_v2" : "student.create_v2",
                "students", savedStudent.id, {
                    nisn,
                    email: normalizedEmail,
                    name: name.trim(),
                    class_name: class_name.trim(),
                    model_key: FACE_MODEL_KEY,
                    sample_count: faceEmbeddings.length,
                    dimensions: FACE_EMBEDDING_DIMENSIONS
                });
            return res.status(201).json({
                student: savedStudent,
                face_model: FACE_MODEL_KEY,
                embedding_dimensions: FACE_EMBEDDING_DIMENSIONS
            });
        } catch (error) {
            // Avoid leaving a new student account that silently appears enrolled
            // when the private biometric template write fails.
            if (newlyCreatedStudentId) {
                try {
                    await supabaseRequest("students?id=eq." + encodeURIComponent(newlyCreatedStudentId), { method: "DELETE" });
                } catch (cleanupError) {
                    console.error("Student cleanup after face enrollment failure failed:", cleanupError);
                }
            }
            if (error.code === "23505") return jsonError(res, 409, "A student with this NISN already exists");
            console.error("Student ArcFace registration failed:", error);
            return jsonSupabaseError(res, error, "Unable to save student and face embeddings");
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
            const teacherRows = await supabaseRequest(
                "teachers?select=id&email=eq." + encodeURIComponent(actor?.email || "") + "&is_active=eq.true&limit=1"
            );
            const teacher = teacherRows?.[0];
            if (!teacher) return jsonError(res, 403, "An active teacher account is required");
            const filter = deleteAll
                ? "?homeroom_teacher_id=eq." + encodeURIComponent(teacher.id)
                : "?nisn=eq." + encodeURIComponent(nisn) + "&homeroom_teacher_id=eq." + encodeURIComponent(teacher.id);
            const deleted = await supabaseRequest(`students?select=id,nisn${filter}`);
            if (!deleteAll && !deleted.length) return jsonError(res, 404, "Student was not found in your homeroom");
            await supabaseRequest(`students${filter}`, { method: "DELETE" });
            await writeAuditLog(actor, deleteAll ? "student.delete_homeroom" : "student.delete", "students",
                deleteAll ? teacher.id : nisn, { count: deleted.length, teacher_id: teacher.id });
            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error("Student delete failed:", error);
            return jsonSupabaseError(res, error, "Unable to delete student");
        }
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return jsonError(res, 405, "Method not allowed");
}
