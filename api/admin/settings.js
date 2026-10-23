import { authorizeAdmin } from "../_lib/admin-api.js";
import { writeAuditLog } from "../_lib/audit.js";
import { jsonError, jsonSupabaseError, supabaseRequest } from "../_lib/supabase.js";
import { validateSchema } from "../_lib/validate.js";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULTS = { lat: -6.253590517740096, lng: 106.60299502682263, radius: 35 };

export default async function handler(req, res) {
    const admin = await authorizeAdmin(req, res, "settings");
    if (!admin) return;
    try {
        if (req.method === "GET") {
            const rows = await supabaseRequest(
                `school_settings?select=lat,lng,radius,timezone,entry_time,late_tolerance_min&id=eq.${SETTINGS_ID}&limit=1`
            );
            if (!rows.length) return res.status(200).json({ ...DEFAULTS, timezone: "Asia/Jakarta", entry_time: "07:00", late_tolerance_min: 15 });
            const row = rows[0];
            return res.status(200).json({
                lat: Number(row.lat), lng: Number(row.lng), radius: Number(row.radius),
                timezone: row.timezone, entry_time: String(row.entry_time).slice(0, 5),
                late_tolerance_min: Number(row.late_tolerance_min)
            });
        }
        if (req.method === "PUT") {
            const body = req.body || {};
            const validation = validateSchema({
                lat: { type: "number", required: true, min: -90, max: 90 },
                lng: { type: "number", required: true, min: -180, max: 180 },
                radius: { type: "number", required: true, min: 10, max: 500 },
                timezone: { type: "string", required: true, max: 64, min: 1 },
                entry_time: { type: "string", required: true, max: 5, pattern: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
                late_tolerance_min: { type: "number", required: true, min: 0, max: 180 }
            }, body);
            if (!validation.valid) return jsonError(res, 400, validation.error);
            try {
                new Intl.DateTimeFormat("en", { timeZone: body.timezone });
            } catch {
                return jsonError(res, 400, "Invalid timezone");
            }
            const rows = await supabaseRequest(
                `school_settings?id=eq.${SETTINGS_ID}&select=lat,lng,radius,timezone,entry_time,late_tolerance_min`,
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        ...body,
                        updated_by: admin.email,
                        updated_at: new Date().toISOString()
                    })
                }
            );
            if (!rows.length) return jsonError(res, 404, "School settings are not initialized");
            await writeAuditLog(admin, "settings.update", "school_settings", SETTINGS_ID, body);
            return res.status(200).json(rows[0]);
        }
        res.setHeader("Allow", "GET, PUT");
        return jsonError(res, 405, "Method not allowed");
    } catch (error) {
        console.error("Admin settings request failed:", error);
        return jsonSupabaseError(res, error, "Unable to manage school settings");
    }
}
