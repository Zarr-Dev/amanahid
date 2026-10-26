import { authorizeAdmin } from "../_lib/admin-api.js";
import { jakartaDateTime, jsonError, jsonSupabaseError, supabaseCount } from "../_lib/supabase.js";

function subtractDays(date, days) {
    const result = new Date(`${date}T12:00:00Z`);
    result.setUTCDate(result.getUTCDate() - days);
    return result.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
    const admin = await authorizeAdmin(req, res, "dashboard-stats");
    if (!admin) return;
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return jsonError(res, 405, "Method not allowed");
    }
    try {
        const { date } = jakartaDateTime();
        const weekAgo = subtractDays(date, 6);
        const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [students, teachers, today, week, activeStudents, activeTeachers, activeAdmins] = await Promise.all([
            supabaseCount("students?select=id&is_active=eq.true"),
            supabaseCount("teachers?select=id&is_active=eq.true"),
            supabaseCount(`attendance?select=id&date=eq.${date}`),
            supabaseCount(`attendance?select=id&and=(date.gte.${weekAgo},date.lte.${date})`),
            supabaseCount(`students?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(activeSince)}`),
            supabaseCount(`teachers?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(activeSince)}`),
            supabaseCount(`admin_users?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(activeSince)}`)
        ]);
        return res.status(200).json({
            total_students: students ?? 0,
            total_teachers: teachers ?? 0,
            attendance_today: today ?? 0,
            attendance_week: week ?? 0,
            active_users_week: (activeStudents ?? 0) + (activeTeachers ?? 0) + (activeAdmins ?? 0),
            health: {
                supabase: "ok",
                vercel: "ok",
                fonnte: process.env.FONNTE_TOKEN ? "configured" : "not_configured"
            }
        });
    } catch (error) {
        console.error("Admin dashboard stats failed:", error);
        return jsonSupabaseError(res, error, "Unable to load dashboard statistics");
    }
}
