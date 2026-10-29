import { authorizeAdmin } from "../_lib/admin-api.js";
import { rateLimit, jsonError, jsonSupabaseError } from "../_lib/supabase.js";
import { sendWhatsApp } from "../_lib/whatsapp.js";
import { writeAuditLog } from "../_lib/audit.js";

const DEFAULT_TEMPLATE = "Amanah ID: ini adalah pesan uji notifikasi WhatsApp. Tidak ada presensi atau data siswa yang diubah.";

function configuredRecipients() {
    return String(process.env.FONNTE_TEST_RECIPIENTS || "")
        .split(",")
        .map(value => value.replace(/\D/g, ""))
        .filter(value => /^628\d{8,13}$/.test(value))
        .filter((value, index, all) => all.indexOf(value) === index)
        .slice(0, 10);
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const admin = await authorizeAdmin(req, res, "test-tools");
    if (!admin) return;

    const recipients = configuredRecipients();
    if (req.method === "GET") {
        return res.status(200).json({
            fonnte_configured: Boolean(process.env.FONNTE_TOKEN),
            allowlist_configured: recipients.length > 0,
            allowed_recipients: recipients,
            template: DEFAULT_TEMPLATE
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return jsonError(res, 405, "Method not allowed");
    }
    if (!rateLimit(req, "admin:fonnte-test-send", 2, 60_000, res)) {
        return jsonError(res, 429, "Only two WhatsApp test messages are allowed per minute");
    }
    const body = req.body || {};
    const target = typeof body.target === "string" ? body.target.replace(/\D/g, "") : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (body.confirm !== true) return jsonError(res, 400, "Explicit confirmation is required");
    if (!recipients.includes(target)) return jsonError(res, 403, "Recipient is not on the configured Fonnte test allowlist");
    if (!process.env.FONNTE_TOKEN) return jsonError(res, 503, "FONNTE_TOKEN is not configured");
    if (message.length < 10 || message.length > 300 || /[\u0000-\u001F\u007F]/.test(message)) {
        return jsonError(res, 400, "Test message must contain 10 to 300 printable characters");
    }

    try {
        await sendWhatsApp(target, message);
    } catch (error) {
        console.error("Admin Fonnte test failed:", error);
        try {
            await writeAuditLog(admin, "admin.fonnte_test.failed", "whatsapp_test", null, {
                recipient_suffix: target.slice(-4),
                reason: String(error?.message || "provider error").slice(0, 100)
            });
        } catch (auditError) {
            console.error("Fonnte test audit failed:", auditError);
        }
        return jsonError(res, 502, "Fonnte could not accept the test message");
    }
    try {
        await writeAuditLog(admin, "admin.fonnte_test.send", "whatsapp_test", null, {
            recipient_suffix: target.slice(-4),
            message_length: message.length,
            result: "accepted"
        });
    } catch (auditError) {
        // A post-send audit failure must not falsely report that the message itself failed.
        console.error("Fonnte test audit failed after provider acceptance:", auditError);
    }
    return res.status(200).json({ ok: true, accepted: true });
}
