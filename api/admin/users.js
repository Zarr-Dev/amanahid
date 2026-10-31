import { hashPassword, validatePassword } from "../_lib/admin-auth.js";
import { authorizeAdmin } from "../_lib/admin-api.js";
import { writeAuditLog } from "../_lib/audit.js";
import { jsonError, jsonSupabaseError, supabaseRequest } from "../_lib/supabase.js";
import { validateSchema } from "../_lib/validate.js";
import { getFeatureFlags, featureDisabled } from "../_lib/features.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validBody(res, schema, body) {
    const result = validateSchema(schema, body);
    if (!result.valid) {
        jsonError(res, 400, result.error);
        return false;
    }
    return true;
}

async function allUsers() {
    const [studentRows, teacherRows] = await Promise.all([
        supabaseRequest("students?select=id,nisn,email,name,class_name,parent_whatsapp,is_active,created_at&order=name.asc"),
        supabaseRequest("teachers?select=id,email,name,is_active,created_at&order=name.asc")
    ]);
    const students = Array.isArray(studentRows)
        ? studentRows.filter(user => user && typeof user === "object") : [];
    const teachers = Array.isArray(teacherRows)
        ? teacherRows.filter(user => user && typeof user === "object") : [];
    return [
        ...students.map(user => ({ ...user, role: "siswa", table: "students" })),
        ...teachers.map(user => ({ ...user, role: "guru", table: "teachers" }))
    ];
}

export default async function handler(req, res) {
    const admin = await authorizeAdmin(req, res, "users");
    if (!admin) return;
    try {
        if (req.method === "GET") {
            return res.status(200).json({ users: await allUsers() });
        }
        if (req.method === "POST") {
            const body = req.body || {};
            const schema = {
                role: { type: "string", required: true, max: 10, pattern: /^(guru|siswa)$/ },
                email: { type: "string", required: true, max: 254, pattern: EMAIL },
                name: { type: "string", required: true, max: 120, min: 1, pattern: /^[^\u0000-\u001F\u007F]+$/ },
                password: { type: "string", required: true, max: 128 },
                nisn: { type: "string", max: 20, pattern: /^\d{8,20}$/ },
                parent_whatsapp: { type: "string", max: 15, pattern: /^(08|628)\d{8,13}$/ },
                class_name: { type: "string", max: 40, min: 1, pattern: /^[^\u0000-\u001F\u007F]+$/ }
            };
            if (!validBody(res, schema, body)) return;
            const features = await getFeatureFlags();
            if (body.role === "guru" && !features.teacher_account_creation) return featureDisabled(res, "teacher_account_creation", "Pembuatan akun Guru sedang dinonaktifkan");
            if (body.role === "siswa" && !features.student_account_creation) return featureDisabled(res, "student_account_creation", "Pembuatan akun Siswa sedang dinonaktifkan");
            if (!validatePassword(body.password)) return jsonError(res, 400, "Password must contain 8 to 128 safe characters");

            const email = body.email.trim().toLowerCase();
            const name = body.name.trim();
            const [studentEmailRows, teacherEmailRows] = await Promise.all([
                supabaseRequest(`students?select=id&email=eq.${encodeURIComponent(email)}&limit=1`),
                supabaseRequest(`teachers?select=id&email=eq.${encodeURIComponent(email)}&limit=1`)
            ]);
            if ((Array.isArray(studentEmailRows) && studentEmailRows.length) ||
                (Array.isArray(teacherEmailRows) && teacherEmailRows.length)) {
                return jsonError(res, 409, "User email already exists");
            }

            const password_hash = await hashPassword(body.password);
            if (body.role === "guru") {
                const rows = await supabaseRequest("teachers?select=id,email,name,created_at", {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({ email, name, password_hash, role: "guru", is_active: true })
                }) ?? [];
                const created = Array.isArray(rows) ? (rows[0] ?? null) : null;
                if (!created) return jsonError(res, 502, "Supabase did not return the created user");
                await writeAuditLog(admin, "guru.create", "teachers", created.id, { email, name, role: "guru" });
                return res.status(201).json({ user: { ...created, role: "guru", table: "teachers" } });
            }

            if (!/^\d{8,20}$/.test(body.nisn || "")) {
                return jsonError(res, 400, "NISN siswa wajib diisi dengan 8 sampai 20 digit");
            }
            if (typeof body.class_name !== "string" || !body.class_name.trim()) {
                return jsonError(res, 400, "Kelas siswa wajib diisi");
            }
            const duplicateNisn = await supabaseRequest(
                `students?select=id&nisn=eq.${encodeURIComponent(body.nisn)}&limit=1`
            );
            if (Array.isArray(duplicateNisn) && duplicateNisn.length) {
                return jsonError(res, 409, "NISN siswa sudah terdaftar");
            }
            // The Admin can provision a student login immediately. Face enrollment remains
            // a separate teacher workflow, so an empty descriptor list cannot pass attendance.
            const rows = await supabaseRequest("students?select=id,nisn,email,name,class_name,created_at", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    nisn: body.nisn,
                    name,
                    class_name: body.class_name.trim(),
                    parent_whatsapp: body.parent_whatsapp ? body.parent_whatsapp.replace(/^08/, "628") : null,
                    face_descriptors: [],
                    email,
                    password_hash,
                    role: "siswa",
                    is_active: true
                })
            }) ?? [];
            const created = Array.isArray(rows) ? (rows[0] ?? null) : null;
            if (!created) return jsonError(res, 502, "Supabase did not return the created student");
            await writeAuditLog(admin, "siswa.create", "students", created.id, {
                email, name, role: "siswa", nisn: body.nisn, class_name: body.class_name.trim(),
                face_enrollment_required: true
            });
            return res.status(201).json({ user: { ...created, role: "siswa", table: "students", face_enrollment_required: true } });
        }
        if (req.method === "PUT") {
            const body = req.body || {};
            const schema = {
                id: { type: "string", required: true, max: 36, pattern: UUID },
                table: { type: "string", required: true, max: 8, pattern: /^(students|teachers)$/ },
                parent_whatsapp: { type: "string", max: 15, pattern: /^(?:|08\d{8,13}|628\d{8,13})$/ },
                email: { type: "string", max: 254, pattern: EMAIL },
                name: { type: "string", max: 120, min: 1, pattern: /^[^\u0000-\u001F\u007F]+$/ },
                password: { type: "string", max: 128 }
            };
            if (!validBody(res, schema, body)) return;
            if (!body.email && !body.name && !body.password && body.parent_whatsapp === undefined) {
                return jsonError(res, 400, "At least one field must be changed");
            }
            if (body.email) {
                const otherTable = body.table === "students" ? "teachers" : "students";
                const duplicate = await supabaseRequest(
                    `${otherTable}?select=id&email=eq.${encodeURIComponent(body.email.trim().toLowerCase())}&limit=1`
                );
                if ((Array.isArray(duplicate) ? duplicate.length : 0) > 0) return jsonError(res, 409, "User email already exists");
            }
            if (body.password && !validatePassword(body.password)) {
                return jsonError(res, 400, "Password must contain 8 to 128 safe characters");
            }
            const values = {};
            if (body.email) values.email = body.email.trim().toLowerCase();
            if (body.name) values.name = body.name.trim();
            if (body.password) values.password_hash = await hashPassword(body.password);
            if (body.parent_whatsapp !== undefined) {
                if (body.table !== "students") return jsonError(res, 400, "WhatsApp wali hanya berlaku untuk akun siswa");
                values.parent_whatsapp = body.parent_whatsapp ? body.parent_whatsapp.replace(/^08/, "628") : null;
            }
            const rows = await supabaseRequest(
                `${body.table}?id=eq.${encodeURIComponent(body.id)}&select=id,email,name,parent_whatsapp`,
                { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(values) }
            ) ?? [];
            const updated = Array.isArray(rows) ? (rows[0] ?? null) : null;
            if (!updated) return jsonError(res, 404, "User not found");
            await writeAuditLog(admin, `${body.table === "students" ? "student" : "teacher"}.update`,
                body.table, body.id, { ...values, password_hash: undefined });
            return res.status(200).json({ user: updated });
        }
        if (req.method === "DELETE") {
            const features = await getFeatureFlags();
            if (!features.account_deactivation) return featureDisabled(res, "account_deactivation", "Penonaktifan akun sedang dinonaktifkan");
            const body = req.body || {};
            if (!validBody(res, {
                id: { type: "string", required: true, max: 36, pattern: UUID },
                table: { type: "string", required: true, max: 8, pattern: /^(students|teachers)$/ }
            }, body)) return;
            const rows = await supabaseRequest(
                `${body.table}?id=eq.${encodeURIComponent(body.id)}&select=id,email`,
                { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ is_active: false }) }
            ) ?? [];
            const deactivated = Array.isArray(rows) ? (rows[0] ?? null) : null;
            if (!deactivated) return jsonError(res, 404, "User not found");
            await writeAuditLog(admin, `${body.table === "students" ? "student" : "teacher"}.deactivate`,
                body.table, body.id, { email: deactivated.email ?? null });
            return res.status(200).json({ ok: true });
        }
        res.setHeader("Allow", "GET, POST, PUT, DELETE");
        return jsonError(res, 405, "Method not allowed");
    } catch (error) {
        if (error.code === "23505") return jsonError(res, 409, "User email or identifier already exists");
        console.error("Admin user operation failed:", error);
        return jsonSupabaseError(res, error, "Unable to manage user");
    }
}
