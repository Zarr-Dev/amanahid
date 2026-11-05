import { rateLimit, jsonError } from "../_lib/supabase.js";
import { normalizeWhatsAppNumber, sendWhatsApp } from "../_lib/whatsapp.js";
import { writeAuditLog } from "../_lib/audit.js";

const DEFAULT_TEMPLATE = "Amanah ID: ini adalah pesan uji notifikasi WhatsApp. Tidak ada presensi atau data siswa yang diubah.";

export async function handleAdminTestTools(req, res, admin) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "GET") {
        return res.status(200).json({
            fonnte_configured: Boolean(process.env.FONNTE_TOKEN),
            template: DEFAULT_TEMPLATE
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return jsonError(res, 405, "Metode permintaan tidak diizinkan.");
    }
    if (!rateLimit(req, "admin:fonnte-test-send", 2, 60_000, res)) {
        return jsonError(res, 429, "Terlalu banyak pesan uji. Tunggu sebentar sebelum mencoba lagi.");
    }

    const body = req.body || {};
    const target = normalizeWhatsAppNumber(body.target);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (body.confirm !== true) return jsonError(res, 400, "Centang persetujuan sebelum mengirim pesan uji.");
    if (!target) return jsonError(res, 400, "Masukkan nomor WhatsApp Indonesia yang valid.");
    if (!process.env.FONNTE_TOKEN) return jsonError(res, 503, "Layanan WhatsApp belum dikonfigurasi. Hubungi Admin teknis sekolah.");
    if (message.length < 10 || message.length > 300 || /[\u0000-\u001F\u007F]/.test(message)) {
        return jsonError(res, 400, "Pesan uji harus berisi 10 sampai 300 karakter yang dapat dibaca.");
    }

    try {
        const providerResult = await sendWhatsApp(target, message);
        try {
            await writeAuditLog(admin, "admin.fonnte_test.send", "whatsapp_test", null, {
                recipient_suffix: target.slice(-4),
                message_length: message.length,
                result: "accepted"
            });
        } catch (auditError) {
            console.error("Fonnte test audit failed after provider acceptance:", auditError);
        }
        return res.status(200).json({
            ok: true,
            accepted: true,
            process: providerResult?.process || "pending"
        });
    } catch (error) {
        console.error("Admin Fonnte test failed:", error);
        try {
            await writeAuditLog(admin, "admin.fonnte_test.failed", "whatsapp_test", null, {
                recipient_suffix: target.slice(-4),
                reason: String(error?.code || "provider error").slice(0, 100)
            });
        } catch (auditError) {
            console.error("Fonnte test audit failed:", auditError);
        }
        const uncertain = ["FONNTE_TIMEOUT", "FONNTE_NETWORK_ERROR", "FONNTE_UNCERTAIN_RESPONSE"].includes(error?.code);
        return jsonError(res, 502, uncertain
            ? "Status pesan uji belum dapat dipastikan. Periksa riwayat Fonnte sebelum mengirim ulang."
            : "Fonnte belum menerima pesan uji. Periksa koneksi WhatsApp lalu coba lagi.");
    }
}
