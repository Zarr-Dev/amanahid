import { authorizeAdmin } from "../_lib/admin-api.js";
import { jakartaDateTime, jsonError, jsonSupabaseError, supabaseCount, supabaseRequest } from "../_lib/supabase.js";

function isDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function handler(req, res) {
    const admin = await authorizeAdmin(req, res, "audit");
    if (!admin) return;
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return jsonError(res, 405, "Method not allowed");
    }
    if (req.query?.action === "stats") {
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
            const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const [students, teachers, today, activeStudents, activeTeachers, activeAdmins, trendCounts] = await Promise.all([
                supabaseCount("students?select=id&is_active=eq.true"),
                supabaseCount("teachers?select=id&is_active=eq.true"),
                supabaseCount(`attendance?select=id&date=eq.${date}`),
                supabaseCount(`students?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(activeSince)}`),
                supabaseCount(`teachers?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(activeSince)}`),
                supabaseCount(`admin_users?select=id&is_active=eq.true&last_login_at=gte.${encodeURIComponent(activeSince)}`),
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
                health: { supabase: "ok", vercel: "ok", fonnte: process.env.FONNTE_TOKEN ? "configured" : "not_configured" }
            });
        } catch (error) {
            console.error("Admin dashboard stats failed:", error);
            return jsonSupabaseError(res, error, "Unable to load dashboard statistics");
        }
    }
    const { actor, action, from, to } = req.query || {};
    if ([actor, action].some(value => value !== undefined && (typeof value !== "string" || value.length > 254)) ||
        (from !== undefined && !isDate(from)) ||
        (to !== undefined && !isDate(to)) ||
        (from && to && from > to)) {
        return jsonError(res, 400, "Invalid audit filters");
    }
    try {
        let query = "audit_log?select=id,actor_email,actor_role,action,target_table,target_id,metadata,created_at&order=created_at.desc&limit=200";
        if (actor) query += `&actor_email=ilike.${encodeURIComponent(`*${actor}*`)}`;
        if (action) query += `&action=ilike.${encodeURIComponent(`*${action}*`)}`;
        if (from) query += `&created_at=gte.${encodeURIComponent(`${from}T00:00:00Z`)}`;
        if (to) query += `&created_at=lte.${encodeURIComponent(`${to}T23:59:59Z`)}`;
        const result = await supabaseRequest(query);
        const entries = Array.isArray(result)
            ? result.filter(entry => entry && typeof entry === "object") : [];
        return res.status(200).json({ entries });
    } catch (error) {
        console.error("Admin audit query failed:", error);
        return jsonSupabaseError(res, error, "Unable to load audit log");
    }
}
