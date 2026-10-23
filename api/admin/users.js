import { hashPassword, validatePassword } from "../../lib/admin-auth.js";
import { authorizeAdmin } from "../../lib/admin-api.js";
import { writeAuditLog } from "../../lib/audit.js";
import { jsonError, jsonSupabaseError, supabaseRequest } from "../../lib/supabase.js";
import { validateSchema } from "../../lib/validate.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NISN = /^\d{8,20}$/;
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
    const [students, teachers] = await Promise.all([
        supabaseRequest("students?select=id,nisn,email,name,class_name,is_active,created_at&order=name.asc"),
        supabaseRequest("teachers?select=id,email,name,is_active,created_at&order=name.asc")
    ]);
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
                role: { type: "string", required: true, max: 10, pattern: /^(siswa|guru)$/ },
                email: { type: "string", required: true, max: 254, pattern: EMAIL },
                name: { type: "string", required: true, max: 120, min: 1, pattern: /^[^\u0000-\u001F\u007F]+$/ },
                password: { type: "string", required: true, max: 128 },
                nisn: { type: "string", max: 20, pattern: NISN },
                class_name: { type: "string", max: 40, min: 1 },
                parent_whatsapp: { type: "string", max: 15, pattern: /^(08|628)\d{8,13}$/ }
            };
            if (!validBody(res, schema, body)) return;
            if (!validatePassword(body.password)) return jsonError(res, 400, "Password must contain 8 to 128 safe characters");
            if (body.role === "siswa" && (!body.nisn || !body.class_name)) {
                return jsonError(res, 400, "Student users require NISN and class_name");
            }
            if (body.role === "guru" && (body.nisn || body.class_name || body.parent_whatsapp)) {
                return jsonError(res, 400, "Student-only fields are not accepted for teachers");
            }
            const email = body.email.trim().toLowerCase();
            const otherTable = body.role === "guru" ? "students" : "teachers";
            const duplicates = await supabaseRequest(
                `${otherTable}?select=id&email=eq.${encodeURIComponent(email)}&limit=1`
            );
            if (duplicates.length) return jsonError(res, 409, "User email already exists");
            const password_hash = await hashPassword(body.password);
            const table = body.role === "guru" ? "teachers" : "students";
            const values = body.role === "guru"
                ? { email, name: body.name.trim(), password_hash }
                : {
                    email, name: body.name.trim(), password_hash, nisn: body.nisn,
                    class_name: body.class_name.trim(), parent_whatsapp: body.parent_whatsapp || null,
                    face_descriptors: []
                };
            const rows = await supabaseRequest(`${table}?select=id,email,name,created_at`, {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(values)
            });
            await writeAuditLog(admin, `${body.role}.create`, table, rows[0]?.id, {
                email, name: body.name.trim(), role: body.role
            });
            return res.status(201).json({ user: { ...rows[0], role: body.role, table } });
        }
        if (req.method === "PUT") {
            const body = req.body || {};
            const schema = {
                id: { type: "string", required: true, max: 36, pattern: UUID },
                table: { type: "string", required: true, max: 8, pattern: /^(students|teachers)$/ },
                email: { type: "string", max: 254, pattern: EMAIL },
                name: { type: "string", max: 120, min: 1, pattern: /^[^\u0000-\u001F\u007F]+$/ },
                password: { type: "string", max: 128 }
            };
            if (!validBody(res, schema, body)) return;
            if (!body.email && !body.name && !body.password) {
                return jsonError(res, 400, "At least one field must be changed");
            }
            if (body.email) {
                const otherTable = body.table === "students" ? "teachers" : "students";
                const duplicate = await supabaseRequest(
                    `${otherTable}?select=id&email=eq.${encodeURIComponent(body.email.trim().toLowerCase())}&limit=1`
                );
                if (duplicate.length) return jsonError(res, 409, "User email already exists");
            }
            if (body.password && !validatePassword(body.password)) {
                return jsonError(res, 400, "Password must contain 8 to 128 safe characters");
            }
            const values = {};
            if (body.email) values.email = body.email.trim().toLowerCase();
            if (body.name) values.name = body.name.trim();
            if (body.password) values.password_hash = await hashPassword(body.password);
            const rows = await supabaseRequest(
                `${body.table}?id=eq.${encodeURIComponent(body.id)}&select=id,email,name`,
                { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(values) }
            );
            if (!rows.length) return jsonError(res, 404, "User not found");
            await writeAuditLog(admin, `${body.table === "students" ? "student" : "teacher"}.update`,
                body.table, body.id, { ...values, password_hash: undefined });
            return res.status(200).json({ user: rows[0] });
        }
        if (req.method === "DELETE") {
            const body = req.body || {};
            if (!validBody(res, {
                id: { type: "string", required: true, max: 36, pattern: UUID },
                table: { type: "string", required: true, max: 8, pattern: /^(students|teachers)$/ }
            }, body)) return;
            const rows = await supabaseRequest(
                `${body.table}?id=eq.${encodeURIComponent(body.id)}&select=id,email`,
                { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ is_active: false }) }
            );
            if (!rows.length) return jsonError(res, 404, "User not found");
            await writeAuditLog(admin, `${body.table === "students" ? "student" : "teacher"}.deactivate`,
                body.table, body.id, { email: rows[0].email });
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
