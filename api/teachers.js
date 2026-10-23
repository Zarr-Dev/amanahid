import { hashPassword, validatePassword } from "../lib/admin-auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { getRequestRole, isAllowedOrigin, jsonError, jsonSupabaseError, rateLimit, supabaseRequest, verifyAdminSession } from "../lib/supabase.js";
import { validateSchema } from "../lib/validate.js";

export default async function handler(req, res) {
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");

    if (req.method === "GET") {
        let role;
        try {
            role = await getRequestRole(req);
        } catch (error) {
            console.error("Teacher query authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        if (role !== "guru") return jsonError(res, 403, "Teacher access is required");
        try {
            const teachers = await supabaseRequest(
                "teachers?select=id,email,name,created_at,is_active&is_active=eq.true&order=name.asc"
            );
            return res.status(200).json({ teachers });
        } catch (error) {
            console.error("Teacher query failed:", error);
            return jsonSupabaseError(res, error, "Unable to load teachers");
        }
    }

    if (req.method === "POST") {
        if (!rateLimit(req, "teachers:POST", 60, 60_000, res)) {
            return jsonError(res, 429, "Too many teacher requests");
        }
        let admin;
        try {
            admin = await verifyAdminSession(req);
        } catch (error) {
            console.error("Admin session validation failed:", error);
            return jsonError(res, 503, "Unable to validate admin session");
        }
        if (!admin) return jsonError(res, 401, "Admin session is required");
        const body = req.body || {};
        const validation = validateSchema({
            email: { type: "string", required: true, max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            name: { type: "string", required: true, max: 120, min: 1, pattern: /^[^\u0000-\u001F\u007F]+$/ },
            password: { type: "string", required: true, max: 128 }
        }, body);
        if (!validation.valid) return jsonError(res, 400, validation.error);
        if (!validatePassword(body.password)) return jsonError(res, 400, "Invalid password");
        try {
            const rows = await supabaseRequest("teachers?select=id,email,name,created_at", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    email: body.email.trim().toLowerCase(),
                    name: body.name.trim(),
                    password_hash: await hashPassword(body.password)
                })
            });
            await writeAuditLog(admin, "teacher.create", "teachers", rows[0]?.id, {
                email: body.email.trim().toLowerCase(), name: body.name.trim()
            });
            return res.status(201).json({ teacher: rows[0] });
        } catch (error) {
            if (error.code === "23505") return jsonError(res, 409, "A teacher with this email already exists");
            console.error("Teacher insert failed:", error);
            return jsonSupabaseError(res, error, "Unable to save teacher data");
        }
    }

    res.setHeader("Allow", "GET, POST");
    return jsonError(res, 405, "Method not allowed");
}
