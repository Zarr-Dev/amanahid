import {
    getRequestRole, getSession, isAllowedOrigin, jsonError,
    jsonSupabaseError, rateLimit, supabaseRequest
} from "./_lib/supabase.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    let role;
    try { role = await getRequestRole(req); }
    catch (error) {
        console.error("Notification authorization failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate session");
    }
    if (role !== "siswa") return jsonError(res, 403, "Student session is required");
    const session = getSession(req);
    if (!session?.nisn || !/^\\d{8,20}$/.test(session.nisn)) {
        return jsonError(res, 403, "Student identity is required");
    }
    if (req.method === "GET") {
        try {
            const students = await supabaseRequest(
                "students?select=id&nisn=eq." + encodeURIComponent(session.nisn) + "&is_active=eq.true&limit=1"
            );
            if (!students.length) return jsonError(res, 404, "Student account was not found");
            const rows = await supabaseRequest(
                "notifications?select=id,event_type,title,body,related_id,read_at,created_at&student_id=eq." +
                encodeURIComponent(students[0].id) + "&order=created_at.desc&limit=100"
            );
            return res.status(200).json({ notifications: rows });
        } catch (error) {
            console.error("Student notifications query failed:", error);
            return jsonSupabaseError(res, error, "Unable to load notifications");
        }
    }
    if (req.method === "PATCH") {
        if (!rateLimit(req, "notifications:PATCH:siswa", 30, 60_000, res)) {
            return jsonError(res, 429, "Too many notification updates");
        }
        const id = req.body?.id;
        if (typeof id !== "string" || !UUID.test(id)) return jsonError(res, 400, "A valid notification ID is required");
        try {
            const students = await supabaseRequest(
                "students?select=id&nisn=eq." + encodeURIComponent(session.nisn) + "&is_active=eq.true&limit=1"
            );
            if (!students.length) return jsonError(res, 404, "Student account was not found");
            const rows = await supabaseRequest(
                "notifications?id=eq." + encodeURIComponent(id) + "&student_id=eq." +
                encodeURIComponent(students[0].id) + "&select=id,read_at",
                { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ read_at: new Date().toISOString() }) }
            );
            if (!rows.length) return jsonError(res, 404, "Notification was not found");
            return res.status(200).json({ notification: rows[0] });
        } catch (error) {
            console.error("Student notification update failed:", error);
            return jsonSupabaseError(res, error, "Unable to update notification");
        }
    }
    res.setHeader("Allow", "GET, PATCH");
    return jsonError(res, 405, "Method not allowed");
}
