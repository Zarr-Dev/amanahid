import { authorizeAdmin } from "../../lib/admin-api.js";
import { jsonError, jsonSupabaseError, supabaseRequest } from "../../lib/supabase.js";

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
        return res.status(200).json({ entries: await supabaseRequest(query) });
    } catch (error) {
        console.error("Admin audit query failed:", error);
        return jsonSupabaseError(res, error, "Unable to load audit log");
    }
}
