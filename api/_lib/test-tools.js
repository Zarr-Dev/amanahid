import { rateLimit, jsonError } from "../_lib/supabase.js";
import { sendWhatsApp } from "../_lib/whatsapp.js";
import { writeAuditLog } from "../_lib/audit.js";

const DEFAULT_TEMPLATE = "Amanah ID: ini adalah pesan uji notifikasi WhatsApp. Tidak ada presensi atau data siswa yang diubah.";

function normalizeTarget(value) {
    if (typeof value !== "string") return "";
    const digits = value.replace(/\\D/g, "");
    if (/^08\\d{8,13}$/.test(digits)) return digits.replace(/^08/, "628");
    return /^628\\d{8,13}$/.test(digits) ? digits : "";
}

function fonnteConfigured() {
    return typeof process.env.FONNTE_TOKEN === "string" &&
        process.env.FONNTE_TOKEN.trim().length >= 10;
}

export async function handleAdminTestTools(req, res, admin) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "GET") {
        return res.status(200).json({
            provider: "Fonnte",
            fonnte_configured: fonnteConfigured(),
            test_send_enabled: true,
            recipient_allowlist_required: false,
            template: DEFAULT_TEMPLATE
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return jsonError(res, 405, "Method not allowed");
    }
    if (!rateLimit(req, "admin:fonnte-test-send", 2, 60_000, res)) {
        return jsonError(res, 429, "Hanya dua pesan uji WhatsApp yang diizinkan setiap menit.");
    }

    const body = req.body || {};
    const target = normalizeTarget(body.target);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (body.confirm !== true) {
        return res.status(400).json({ code: "FONNTE_CONFIRMATION_REQUIRED", error: "Centang persetujuan sebelum mengirim pesan uji." });
    }
    if (!target) {
        return res.status(400).json({ code: "FONNTE_RECIPIENT_INVALID", error: "Nomor tujuan harus menggunakan format 08 atau 628 yang valid." });
    }
    if (message.length < 10 || message.length > 300 || /[\\u0000-\\u001F\\u007F]/.test(message)) {
        return res.status(400).json({ code: "FONNTE_MESSAGE_INVALID", error: "Pesan uji harus terdiri dari 10–300 karakter yang dapat dicetak." });
    }
    if (!fonnteConfigured()) {
        return res.status(503).json({
            code: "FONNTE_TOKEN_MISSING",
            error: "FONNTE_TOKEN di Vercel Production belum berisi nilai. Isi token di Project Settings → Environment Variables, lalu redeploy Production."
        });
    }

    try {
        const providerResult = await sendWhatsApp(target, message);
        try {
            await writeAuditLog(admin, "admin.fonnte_test.send", "whatsapp_test", null, {
                recipient_suffix: target.slice(-4),
                message_length: message.length,
                result: "accepted_by_provider"
            });
        } catch (auditError) {
            console.error("Fonnte test audit failed after provider acceptance:", auditError);
        }
        return res.status(200).json({
            ok: true,
            accepted: true,
            provider: "Fonnte",
            provider_status: providerResult?.status === true || providerResult?.status === "true" ? "accepted" : "unknown",
            message: "Fonnte menerima permintaan pesan uji. Periksa perangkat WhatsApp tujuan untuk memastikan pesan diterima."
        });
    } catch (error) {
        console.error("Admin Fonnte test failed:", error);
        try {
            await writeAuditLog(admin, "admin.fonnte_test.failed", "whatsapp_test", null, {
                recipient_suffix: target.slice(-4),
                message_length: message.length,
                reason_code: String(error?.code || "FONNTE_ERROR").slice(0, 50)
            });
        } catch (auditError) {
            console.error("Fonnte test audit failed:", auditError);
        }
        const code = String(error?.code || "FONNTE_ERROR");
        const status = error?.status === 504 ? 504 : 502;
        const messageText = code === "FONNTE_TIMEOUT"
            ? "Permintaan ke Fonnte melewati batas waktu. Status pengiriman belum dapat dipastikan."
            : code === "FONNTE_NETWORK_ERROR"
                ? "Layanan Fonnte tidak dapat dijangkau. Periksa koneksi atau coba kembali."
                : "Fonnte menolak permintaan pesan uji. Periksa status perangkat dan token pada Fonnte.";
        return res.status(status).json({ code, error: messageText });
    }
}
