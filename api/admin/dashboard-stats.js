import { authorizeAdmin } from "../_lib/admin-api.js";
import { jakartaDateTime, jsonError, jsonSupabaseError, supabaseCount } from "../_lib/supabase.js";

export default async function handler(req, res) {
    const admin = await authorizeAdmin(req, res, "audit");
    if (!admin) return;
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return jsonError(res, 405, "Method not allowed");
    }

    try {
        const { date } = jakartaDateTime();
        const dates = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(`${date}T12:00:00Z`);
            day.setUTCDate(day.getUTCDate() - (6 - index));
            return day.toISOString().slice(0, 10);
        });
        const [students, teachers, today, activeStudents, activeTeachers, activeAdmins, trendCounts] = await Promise.all([
            supabaseCount("students?select=id&is_active=eq.true"),
            supabaseCount("teachers?select=id&is_active=eq.true"),
            supabaseCount(`attendance?select=id&date=eq.${date}`),
            supabaseCount(`students?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())}`),
            supabaseCount(`teachers?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())}`),
            supabaseCount(`admin_users?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString())}`),
            Promise.all(dates.map(day => supabaseCount(`attendance?select=id&date=eq.${day}`)))
        ]);
        return res.status(200).json({
            generated_at: new Date().toISOString(),
            total_students: students ?? 0,
            total_teachers: teachers ?? 0,
            attendance_today: today ?? 0,
            attendance_week: trendCounts.reduce((sum, value) => sum + (value ?? 0), 0),
            active_users_week: (activeStudents ?? 0) + (activeTeachers ?? 0) + (activeAdmins ?? 0),
            trend: dates.map((day, index) => ({ date: day, count: trendCounts[index] ?? 0 })),
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
