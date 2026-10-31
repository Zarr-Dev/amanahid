import { authorizeAdmin } from "../_lib/admin-api.js";
import { hashPassword, isValidAdminPassword, verifyPassword } from "../_lib/admin-auth.js";
import { writeAuditLog } from "../_lib/audit.js";
import { jsonError, jsonSupabaseError, supabaseRequest } from "../_lib/supabase.js";
import { validateSchema } from "../_lib/validate.js";
import { handleAdminTestTools } from "../_lib/test-tools.js";
import { FEATURE_DEFAULTS, LOCKED_FEATURE_FLAGS, getFeatureFlags, featureDisabled } from "../_lib/features.js";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const FEATURES_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULTS = { lat: -6.253590517740096, lng: 106.60299502682263, radius: 50 };


async function updateAdminPassword(req, res, admin) {
    const body = req.body || {};
    const validation = validateSchema({
        current_password: { type: "string", required: true, max: 64, pattern: /^[a-f0-9]{64}$/ },
        password: { type: "string", required: true, max: 128 }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    if (!isValidAdminPassword(body.password)) {
        return jsonError(res, 400, "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol");
    }
    try {
        const rows = await supabaseRequest(
            `admin_users?select=id,password_hash&email=eq.${encodeURIComponent(admin.email)}&limit=1`
        );
        const profile = Array.isArray(rows) ? (rows[0] ?? null) : null;
        if (!profile || !(await verifyPassword(body.current_password, profile.password_hash))) {
            return jsonError(res, 401, "Current password is incorrect");
        }
        const password_hash = await hashPassword(body.password);
        await supabaseRequest(`admin_users?id=eq.${encodeURIComponent(profile.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ password_hash })
        });
        await writeAuditLog(admin, "admin.password.update", "admin_users", profile.id, {});
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Admin password update failed:", error);
        return jsonSupabaseError(res, error, "Unable to update admin password");
    }
}

export default async function handler(req, res) {
    const action = req.query?.action;
    const admin = await authorizeAdmin(req, res, action === "test-tools" ? "test-tools" : "settings");
    if (!admin) return;
    if (action === "test-tools") return handleAdminTestTools(req, res, admin);
    if (action === "profile") {
        if (req.method !== "PUT") {
            res.setHeader("Allow", "PUT");
            return jsonError(res, 405, "Method not allowed");
        }
        const features = await getFeatureFlags();
        if (!features.admin_password_change) return featureDisabled(res, "admin_password_change", "Perubahan kata sandi Admin sedang dinonaktifkan");
        return updateAdminPassword(req, res, admin);
    }
    if (req.query?.action === "features") {
        try {
            if (req.method === "GET") {
                const [rows, features] = await Promise.all([
                    supabaseRequest(`system_settings?id=eq.${FEATURES_ID}&select=updated_at,updated_by&limit=1`),
                    getFeatureFlags()
                ]);
                const row = Array.isArray(rows) ? rows[0] : null;
                return res.status(200).json({ features, updated_at: row?.updated_at || null });
            }
            if (req.method === "PUT") {
                const body = req.body || {};
                if (!body.features || typeof body.features !== "object" || Array.isArray(body.features)) return jsonError(res, 400, "A feature settings object is required");
                const keys = Object.keys(FEATURE_DEFAULTS);
                if (Object.keys(body.features).some(key => !keys.includes(key)) || keys.some(key => typeof body.features[key] !== "boolean")) {
                    return jsonError(res, 400, "Feature settings must contain only the known boolean flags");
                }
                const features = Object.fromEntries(keys.map(key => [key, body.features[key]]));
                for (const key of LOCKED_FEATURE_FLAGS) features[key] = true;
                const rows = await supabaseRequest("system_settings?on_conflict=id&select=feature_flags,updated_at,updated_by", {
                    method: "POST",
                    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
                    body: JSON.stringify({ id: FEATURES_ID, feature_flags: features, updated_by: admin.email, updated_at: new Date().toISOString() })
                });
                const updated = Array.isArray(rows) ? rows[0] : null;
                if (!updated) return jsonError(res, 500, "Feature settings were not returned after save");
                await writeAuditLog(admin, "system.features.update", "system_settings", FEATURES_ID, { enabled_count: Object.values(features).filter(Boolean).length, total_count: keys.length });
                return res.status(200).json({ features: { ...FEATURE_DEFAULTS, ...updated.feature_flags }, updated_at: updated.updated_at });
            }
            res.setHeader("Allow", "GET, PUT");
            return jsonError(res, 405, "Method not allowed");
        } catch (error) {
            console.error("Admin feature settings failed:", error);
            return jsonSupabaseError(res, error, "Unable to manage system feature settings");
        }
    }
    try {
        if (req.method === "GET") {
            const resultRows = await supabaseRequest(
                `school_settings?select=lat,lng,radius,timezone,entry_time,late_tolerance_min&id=eq.${SETTINGS_ID}&limit=1`
            );
            const row = Array.isArray(resultRows) ? (resultRows[0] ?? null) : null;
            if (!row) return res.status(200).json({ ...DEFAULTS, timezone: "Asia/Jakarta", entry_time: "07:00", late_tolerance_min: 15 });
            return res.status(200).json({
                lat: Number(row.lat ?? DEFAULTS.lat), lng: Number(row.lng ?? DEFAULTS.lng),
                radius: Number(row.radius ?? DEFAULTS.radius),
                timezone: row.timezone ?? "Asia/Jakarta",
                entry_time: String(row.entry_time ?? "07:00").slice(0, 5),
                late_tolerance_min: Number(row.late_tolerance_min ?? 15)
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
            const currentRows = await supabaseRequest(`school_settings?id=eq.${SETTINGS_ID}&select=radius,timezone,entry_time,late_tolerance_min&limit=1`);
            const current = Array.isArray(currentRows) ? currentRows[0] : null;
            if (!current) return jsonError(res, 404, "School settings are not initialized");
            const features = await getFeatureFlags();
            if (!features.geofence_radius_edit && Number(body.radius) !== Number(current.radius)) {
                return featureDisabled(res, "geofence_radius_edit", "Perubahan radius geofence sedang dinonaktifkan");
            }
            if (!features.school_schedule_rules && (
                body.timezone !== current.timezone ||
                String(body.entry_time).slice(0, 5) !== String(current.entry_time).slice(0, 5) ||
                Number(body.late_tolerance_min) !== Number(current.late_tolerance_min)
            )) {
                return featureDisabled(res, "school_schedule_rules", "Perubahan aturan jadwal sekolah sedang dinonaktifkan");
            }
            const resultRows = await supabaseRequest(
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
            const updated = Array.isArray(resultRows) ? (resultRows[0] ?? null) : null;
            if (!updated) return jsonError(res, 404, "School settings are not initialized");
            await writeAuditLog(admin, "settings.update", "school_settings", SETTINGS_ID, body);
            return res.status(200).json(updated);
        }
        res.setHeader("Allow", "GET, PUT");
        return jsonError(res, 405, "Method not allowed");
    } catch (error) {
        console.error("Admin settings request failed:", error);
        return jsonSupabaseError(res, error, "Unable to manage school settings");
    }
}
