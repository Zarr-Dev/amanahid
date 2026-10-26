import { signToken, verifyPassword } from "../_lib/admin-auth.js";
import { writeAuditLog } from "../_lib/audit.js";
import { isAllowedOrigin, jsonError, rateLimit, supabaseRequest } from "../_lib/supabase.js";
import { validateSchema } from "../_lib/validate.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    if (req.query?.action === "logout") {
        if (req.method !== "POST") {
            res.setHeader("Allow", "POST");
            return jsonError(res, 405, "Method not allowed");
        }
        if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
        return res.status(200).json({ ok: true });
    }
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return jsonError(res, 405, "Method not allowed");
    }
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    if (!rateLimit(req, "auth:login", 10, 60_000, res)) {
        return jsonError(res, 429, "Too many login attempts. Try again shortly.");
    }
    const body = req.body || {};
    const validation = validateSchema({
        email: { type: "string", required: true, max: 254, pattern: EMAIL },
        password: { type: "string", required: true, max: 64, pattern: /^[a-f0-9]{64}$/ }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);

    const email = body.email.trim().toLowerCase();
    try {
        const teacherResult = await supabaseRequest(
            `teachers?select=email,name,password_hash,is_active&email=eq.${encodeURIComponent(email)}&limit=1`
        );
        const teachers = Array.isArray(teacherResult) ? teacherResult.filter(Boolean) : [];
        const studentResult = teachers.length ? [] : await supabaseRequest(
            `students?select=email,name,nisn,password_hash,is_active&email=eq.${encodeURIComponent(email)}&limit=1`
        );
        const students = Array.isArray(studentResult) ? studentResult.filter(Boolean) : [];
        const user = teachers[0] ?? students[0] ?? null;
        const role = teachers.length ? "guru" : "siswa";
        if (!user || !user.is_active || !user.password_hash ||
            !(await verifyPassword(body.password, user.password_hash))) {
            return jsonError(res, 401, "Email atau kata sandi tidak valid");
        }
        const session = { email: user.email, name: user.name, role };
        if (role === "siswa") session.nisn = user.nisn;
        const token = signToken(session);
        if (role === "guru") {
            await supabaseRequest(`teachers?email=eq.${encodeURIComponent(email)}`, {
                method: "PATCH",
                body: JSON.stringify({ last_login_at: new Date().toISOString() })
            });
        } else {
            await supabaseRequest(`students?email=eq.${encodeURIComponent(email)}`, {
                method: "PATCH",
                body: JSON.stringify({ last_login_at: new Date().toISOString() })
            });
        }
        await writeAuditLog(session, "auth.login", role === "guru" ? "teachers" : "students", email);
        return res.status(200).json({ user: session, token });
    } catch (error) {
        console.error("Login failed:", error);
        return jsonError(res, 503, "Layanan autentikasi sedang tidak tersedia");
    }
}
