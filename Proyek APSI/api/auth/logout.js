import { isAllowedOrigin, jsonError } from "../_lib/supabase.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    // Sessions are short-lived signed tokens; the client removes its copy on logout.
    return res.status(200).json({ ok: true });
}
