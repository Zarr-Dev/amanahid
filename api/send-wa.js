import { isAllowedOrigin, jsonError } from "../lib/supabase.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }

    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");

    const { target, message } = req.body || {};
    if (typeof target !== "string" || !/^628\d{8,13}$/.test(target)) {
        return jsonError(res, 400, "Invalid recipient number");
    }
    if (typeof message !== "string" || message.length < 10 || message.length > 500 ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) {
        return jsonError(res, 400, "Invalid message");
    }

    try {
        await sendWhatsApp(target, message);
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
