import { signToken, verifyPassword } from "../_lib/admin-auth.js";
import { writeAuditLog } from "../_lib/audit.js";
import { getMissingAuthConfiguration, isAllowedOrigin, jsonError, rateLimit, supabaseRequest } from "../_lib/supabase.js";
import { validateSchema } from "../_lib/validate.js";
import { getFeatureFlags, featureDisabled } from "../_lib/features.js";
import { createLoginCaptcha, verifyLoginCaptcha } from "../_lib/login-captcha.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAPTCHA_ANSWER = /^[A-Za-z0-9]{1,12}$/;

export default async function handler(req, res) {
    if (req.query?.action === "captcha") {
        if (req.method !== "GET") {
            res.setHeader("Allow", "GET");
            return jsonError(res, 405, "Method not allowed");
        }
        if (!isAllowedOrigin(req)) return jsonError(res, 403, "Origin aplikasi tidak cocok dengan APP_ORIGIN.");
        if (!rateLimit(req, "auth:captcha", 30, 60_000, res)) {
            return jsonError(res, 429, "Too many verification requests. Try again shortly.");
        }
        try {
            const { question, token } = createLoginCaptcha(req.query?.lang);
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.setHeader("Pragma", "no-cache");
            return res.status(200).json({ question, token, expiresInSeconds: 180 });
        } catch (error) {
            console.error("Login CAPTCHA creation failed:", error);
            return jsonError(res, 503, "Tantangan keamanan belum tersedia. Periksa konfigurasi sesi.");
        }
    }

    if (req.query?.action === "logout") {
        if (req.method !== "POST") {
            res.setHeader("Allow", "POST");
            return jsonError(res, 405, "Method not allowed");
        }
        if (!isAllowedOrigin(req)) return jsonError(res, 403, "Origin aplikasi tidak cocok dengan APP_ORIGIN.");
        return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }
    const missingConfiguration = getMissingAuthConfiguration();
    if (missingConfiguration.length) {
        return jsonError(res, 503, `Autentikasi belum dikonfigurasi di Vercel: ${missingConfiguration.join(", ")}.`);
    }
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Origin aplikasi tidak cocok dengan APP_ORIGIN.");
    if (!rateLimit(req, "auth:login", 10, 60_000, res)) {
        return jsonError(res, 429, "Too many login attempts. Try again shortly.");
    }

    const body = req.body || {};
    const validation = validateSchema({
        email: { type: "string", required: true, max: 254, pattern: EMAIL },
        password: { type: "string", required: true, max: 64, pattern: /^[a-f0-9]{64}$/ },
        captchaToken: { type: "string", required: true, max: 2048, min: 20 },
        captchaAnswer: { type: "string", required: true, max: 12, pattern: CAPTCHA_ANSWER }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    if (!verifyLoginCaptcha(body.captchaToken, body.captchaAnswer)) {
        return jsonError(res, 400, "CAPTCHA_INVALID: Tantangan keamanan salah atau kedaluwarsa. Perbarui tantangan lalu coba lagi.");
    }

    const email = body.email.trim().toLowerCase();
    try {
        const features = await getFeatureFlags();
        const encodedEmail = encodeURIComponent(email);
        const [adminResult, teacherResult, studentResult] = await Promise.all([
            supabaseRequest(`admin_users?select=email,name,password_hash,is_active&email=eq.${encodedEmail}&limit=1`),
            supabaseRequest(`teachers?select=email,name,password_hash,is_active&email=eq.${encodedEmail}&limit=1`),
            supabaseRequest(`students?select=email,name,nisn,password_hash,is_active&email=eq.${encodedEmail}&limit=1`)
        ]);

        const candidates = [
            { role: "admin", table: "admin_users", feature: "admin_login", rows: adminResult },
            { role: "guru", table: "teachers", feature: "teacher_login", rows: teacherResult },
            { role: "siswa", table: "students", feature: "student_login", rows: studentResult }
        ];
        const matches = candidates.flatMap(candidate => {
            const rows = Array.isArray(candidate.rows) ? candidate.rows.filter(Boolean) : [];
            return rows.slice(0, 1).map(user => ({ ...candidate, user }));
        });

        if (matches.length > 1) {
            return jsonError(res, 409, "Email ini terdaftar pada lebih dari satu jenis akun. Hubungi administrator sekolah.");
        }
        if (matches.length !== 1) return jsonError(res, 401, "Email atau kata sandi tidak valid");

        const match = matches[0];
        if (match.role === "admin" && !rateLimit(req, "auth:login:admin", 5, 60_000, res)) {
            return jsonError(res, 429, "Too many administrator login attempts. Try again shortly.");
        }
        const user = match.user;
        if (!user.is_active || !user.password_hash ||
            !(await verifyPassword(body.password, user.password_hash))) {
            return jsonError(res, 401, "Email atau kata sandi tidak valid");
        }
        if (!features[match.feature]) {
            return featureDisabled(res, match.feature, "Login untuk peran ini sedang dinonaktifkan oleh administrator");
        }

        const session = { email: user.email, name: user.name, role: match.role };
        if (match.role === "siswa") session.nisn = user.nisn;
        const token = signToken(session);
        await supabaseRequest(`${match.table}?email=eq.${encodedEmail}`, {
            method: "PATCH",
            body: JSON.stringify({ last_login_at: new Date().toISOString() })
        });
        await writeAuditLog(session, match.role === "admin" ? "admin.login" : "auth.login", match.table, email);
        return res.status(200).json({ user: session, token });
    } catch (error) {
        console.error("Login failed:", error);
        return jsonError(res, 503, "Layanan autentikasi sedang tidak tersedia");
    }
}
