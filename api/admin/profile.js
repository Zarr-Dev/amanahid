import { hashPassword, isValidAdminPassword, verifyPassword } from "../../lib/admin-auth.js";
import { authorizeAdmin } from "../../lib/admin-api.js";
import { writeAuditLog } from "../../lib/audit.js";
import { jsonError, jsonSupabaseError, supabaseRequest } from "../../lib/supabase.js";
import { validateSchema } from "../../lib/validate.js";

export default async function handler(req, res) {
    const admin = await authorizeAdmin(req, res, "profile");
    if (!admin) return;
    if (req.method !== "PUT") {
        res.setHeader("Allow", "PUT");
        return jsonError(res, 405, "Method not allowed");
    }
    const body = req.body || {};
    const validation = validateSchema({
        current_password: { type: "string", required: true, max: 64, pattern: /^[a-f0-9]{64}$/ },
        password: { type: "string", required: true, max: 128 }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    if (!isValidAdminPassword(body.password)) {
        return jsonError(res, 400, "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol");
    }
    try {
        const rows = await supabaseRequest(
            `admin_users?select=id,password_hash&email=eq.${encodeURIComponent(admin.email)}&limit=1`
        );
        if (!rows.length || !(await verifyPassword(body.current_password, rows[0].password_hash))) {
            return jsonError(res, 401, "Current password is incorrect");
        }
        const password_hash = await hashPassword(body.password);
        await supabaseRequest(`admin_users?id=eq.${encodeURIComponent(rows[0].id)}`, {
            method: "PATCH",
            body: JSON.stringify({ password_hash })
        });
        await writeAuditLog(admin, "admin.password.update", "admin_users", rows[0].id, {});
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Admin password update failed:", error);
        return jsonSupabaseError(res, error, "Unable to update admin password");
    }
}
