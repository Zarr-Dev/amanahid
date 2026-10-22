import { hasRole, isAllowedOrigin, jsonError, supabaseRequest } from "../lib/supabase.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    if (!hasRole(req, "guru")) return jsonError(res, 403, "Teacher role is required");

    const { email, name } = req.body || {};
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return jsonError(res, 400, "Invalid teacher email");
    }
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
        /[\u0000-\u001F\u007F]/.test(name)) {
        return jsonError(res, 400, "Invalid teacher name");
    }

    try {
        const rows = await supabaseRequest(
            `teachers?on_conflict=email&select=id,email,name,created_at`,
            {
                method: "POST",
                headers: { Prefer: "resolution=merge-duplicates,return=representation" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() })
            }
        );
        return res.status(200).json({ teacher: rows[0] });
    } catch (error) {
        console.error("Teacher upsert failed:", error);
        return jsonError(res, 500, "Unable to save teacher data");
    }
}
