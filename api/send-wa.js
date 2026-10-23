import {
    getRequestRole,
    getSession,
    isAllowedOrigin,
    jsonError,
    jsonSupabaseError,
    rateLimit
} from "./_lib/supabase.js";
import { sendWhatsApp } from "./_lib/whatsapp.js";
import { validateSchema } from "./_lib/validate.js";
import { writeAuditLog } from "./_lib/audit.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }

    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    let role;
    try {
        role = await getRequestRole(req);
    } catch (error) {
        console.error("WhatsApp session validation failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate session");
    }
    if (role !== "guru") return jsonError(res, 401, "Teacher session is required");
    if (!rateLimit(req, "send-wa:POST", 10, 60_000, res)) {
        return jsonError(res, 429, "Too many WhatsApp requests");
    }

    const { target, message } = req.body || {};
    const validation = validateSchema({
        target: { type: "string", required: true, max: 15, pattern: /^628\d{8,13}$/ },
        message: { type: "string", required: true, min: 10, max: 500 }
    }, req.body || {});
    if (!validation.valid || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) {
        return jsonError(res, 400, validation.valid ? "Invalid message" : validation.error);
    }
    if (typeof target !== "string" || !/^628\d{8,13}$/.test(target)) {
        return jsonError(res, 400, "Invalid recipient number");
    }
    if (typeof message !== "string" || message.length < 10 || message.length > 500 ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) {
        return jsonError(res, 400, "Invalid message");
    }

    try {
        await sendWhatsApp(target, message);
        await writeAuditLog(getSession(req), "whatsapp.send", "whatsapp", target, { message_length: message.length });
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Fonnte request error:", error);
        if (error.message === "FONNTE_TOKEN is not configured") {
            return jsonError(res, 500, "WhatsApp service is not configured");
        }
        if (error.status === 504) return jsonError(res, 504, "WhatsApp provider timed out");
        return jsonError(res, 502, "WhatsApp provider is unavailable");
    }
}
