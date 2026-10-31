import { signToken, verifyPassword } from "../_lib/admin-auth.js";
import { writeAuditLog } from "../_lib/audit.js";
import { getMissingAuthConfiguration, isAllowedOrigin, jsonError, rateLimit, supabaseRequest } from "../_lib/supabase.js";
import { validateSchema } from "../_lib/validate.js";
import { getFeatureFlags, featureDisabled } from "../_lib/features.js";
import { verifyLoginCaptcha } from "../_lib/login-captcha.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }
    const missingConfiguration = getMissingAuthConfiguration();
    if (missingConfiguration.length) {
        return jsonError(res, 503, `Autentikasi belum dikonfigurasi di Vercel: ${missingConfiguration.join(", ")}.`);
    }
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Origin aplikasi tidak cocok dengan APP_ORIGIN.");
    if (!rateLimit(req, "admin:login", 5, 60_000, res)) {
        return jsonError(res, 429, "Too many login attempts. Try again shortly.");
    }
    const body = req.body || {};
    const validation = validateSchema({
        email: { type: "string", required: true, max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        password: { type: "string", required: true, max: 64, pattern: /^[a-f0-9]{64}$/ },
        captchaToken: { type: "string", required: true, max: 2048, min: 20 },
        captchaAnswer: { type: "string", required: true, max: 12, pattern: /^[A-Za-z0-9]{1,12}$/ }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    if (!verifyLoginCaptcha(body.captchaToken, body.captchaAnswer)) {
        return jsonError(res, 400, "CAPTCHA_INVALID: Tantangan keamanan salah atau kedaluwarsa. Perbarui tantangan lalu coba lagi.");
    }

    try {
        const features = await getFeatureFlags();
        if (!features.admin_login) return featureDisabled(res, "admin_login", "Login Admin sedang dinonaktifkan oleh administrator");
        const email = body.email.trim().toLowerCase();
        const resultRows = await supabaseRequest(
            `admin_users?select=email,name,password_hash,is_active&email=eq.${encodeURIComponent(email)}&limit=1`
        );
        const admin = Array.isArray(resultRows) ? (resultRows[0] ?? null) : null;
        if (!admin || !admin.is_active ||
            !(await verifyPassword(body.password, admin.password_hash))) {
            return jsonError(res, 401, "Email atau kata sandi admin tidak valid");
        }
        const session = { email: admin.email, name: admin.name, role: "admin" };
        await supabaseRequest(`admin_users?email=eq.${encodeURIComponent(email)}`, {
            method: "PATCH",
            body: JSON.stringify({ last_login_at: new Date().toISOString() })
        });
        await writeAuditLog(session, "admin.login", "admin_users", email);
        return res.status(200).json({ user: session, token: signToken(session) });
    } catch (error) {
        console.error("Admin login failed:", error);
        return jsonError(res, 503, "Layanan autentikasi admin sedang tidak tersedia");
    }
}
