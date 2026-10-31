import {
    getRequestRole,
    getSession,
    isAllowedOrigin,
    getMissingAuthConfiguration,
    jsonError,
    jsonSupabaseError,
    supabaseRequest,
    verifyTeacherSession
} from "./_lib/supabase.js";
import { writeAuditLog } from "./_lib/audit.js";
import { validateSchema } from "./_lib/validate.js";
import { getFeatureFlags, publicFeatureFlags, featureDisabled } from "./_lib/features.js";

const SCHOOL_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

function isValidSettings({ lat, lng, radius }) {
    return [lat, lng, radius].every(value => typeof value === "number" && Number.isFinite(value)) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        radius >= 10 && radius <= 500;
}

export default async function handler(req, res) {
    const action = req.query?.action;
    if (action === "health") {
        if (req.method !== "GET" && req.method !== "HEAD") {
            res.setHeader("Allow", "GET, HEAD");
            return res.status(405).json({ error: "Method not allowed", method: req.method });
        }
        const missing = getMissingAuthConfiguration();
        if (missing.length) {
            const payload = {
                ok: false,
                service: "Amanah.id API",
                runtime: process.version,
                checks: { configuration: "failed", database: "not_checked", whatsapp: process.env.FONNTE_TOKEN ? "configured" : "not_configured" },
                missing
            };
            return req.method === "HEAD" ? res.status(503).end() : res.status(503).json(payload);
        }
        try {
            const rows = await supabaseRequest("school_settings?select=id&limit=1");
            if (!Array.isArray(rows) || !rows.length) throw new Error("School settings are not initialized");
            const allowlist = String(process.env.FONNTE_TEST_RECIPIENTS || "").split(",").map(value => value.replace(/\\D/g, "")).filter(value => /^628\\d{8,13}$/.test(value));
            const payload = {
                ok: true,
                service: "Amanah.id API",
                runtime: process.version,
                checks: {
                    configuration: "ok",
                    database: "ok",
                    whatsapp: process.env.FONNTE_TOKEN && allowlist.length ? "ready" : "not_configured"
                }
            };
            return req.method === "HEAD" ? res.status(200).end() : res.status(200).json(payload);
        } catch (error) {
            console.error("API readiness check failed:", error);
            const payload = {
                ok: false,
                service: "Amanah.id API",
                runtime: process.version,
                checks: { configuration: "ok", database: "failed", whatsapp: process.env.FONNTE_TOKEN ? "configured" : "not_configured" }
            };
            return req.method === "HEAD" ? res.status(503).end() : res.status(503).json(payload);
        }
    }
    if (action === "features") {
        if (req.method !== "GET") {
            res.setHeader("Allow", "GET");
            return jsonError(res, 405, "Method not allowed");
        }
        try {
            const allFeatures = await getFeatureFlags();
            const features = publicFeatureFlags(allFeatures);
            return res.status(200).json({ features });
        } catch (error) {
            console.error("Runtime feature configuration failed:", error);
            return res.status(503).json({ error: "Runtime feature configuration is unavailable" });
        }
    }


    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");

    if (req.method === "GET") {
        try {
            if (!await getRequestRole(req)) return jsonError(res, 403, "A valid user role is required");
            const rows = await supabaseRequest(
                `school_settings?select=lat,lng,radius&id=eq.${SCHOOL_SETTINGS_ID}&limit=1`
            );
            if (!rows.length) return jsonError(res, 503, "School location settings are not configured");
            const settings = {
                lat: Number(rows[0].lat),
                lng: Number(rows[0].lng),
                radius: Number(rows[0].radius)
            };
            if (!isValidSettings(settings)) {
                console.error("School location settings contain invalid values");
                return jsonError(res, 503, "School location settings are invalid");
            }
            return res.status(200).json(settings);
        } catch (error) {
            console.error("School settings query failed:", error);
            return jsonSupabaseError(res, error, "Unable to load school location settings");
        }
    }

    if (req.method === "HEAD") {
        try {
            if (!await getRequestRole(req)) return jsonError(res, 403, "A valid user role is required");
            const rows = await supabaseRequest(
                `school_settings?select=id&id=eq.${SCHOOL_SETTINGS_ID}&limit=1`
            );
            if (!rows.length) return jsonError(res, 503, "School location settings are not configured");
            return res.status(200).end();
        } catch (error) {
            console.error("School settings heartbeat failed:", error);
            return jsonSupabaseError(res, error, "Unable to reach school location settings");
        }
    }

    if (req.method === "PUT") {
        try {
            if (!await verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        } catch (error) {
            console.error("School settings authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        const body = req.body || {};
        const validation = validateSchema({
            lat: { type: "number", required: true, min: -90, max: 90 },
            lng: { type: "number", required: true, min: -180, max: 180 },
            radius: { type: "number", required: true, min: 10, max: 500 }
        }, body);
        if (!validation.valid) return jsonError(res, 400, validation.error);
        const { lat, lng, radius } = body;
        if (!isValidSettings({ lat, lng, radius })) {
            return jsonError(res, 400, "Latitude, longitude, or radius is outside the allowed range");
        }
        const updatedBy = getSession(req)?.email;
        try {
            const currentRows = await supabaseRequest(`school_settings?id=eq.${SCHOOL_SETTINGS_ID}&select=radius&limit=1`);
            const current = Array.isArray(currentRows) ? currentRows[0] : null;
            if (!current) return jsonError(res, 503, "School location settings are not configured");
            const features = await getFeatureFlags();
            if (!features.geofence_radius_edit && Number(radius) !== Number(current.radius)) {
                return featureDisabled(res, "geofence_radius_edit", "Perubahan radius geofence sedang dinonaktifkan");
            }
            const rows = await supabaseRequest(
                `school_settings?id=eq.${SCHOOL_SETTINGS_ID}&select=lat,lng,radius`,
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        lat,
                        lng,
                        radius,
                        updated_by: typeof updatedBy === "string" &&
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedBy) && updatedBy.length <= 254
                            ? updatedBy
                            : "guru",
                        updated_at: new Date().toISOString()
                    })
                }
            );
            if (!rows.length) return jsonError(res, 503, "School location settings are not configured");
            await writeAuditLog(
                getSession(req),
                "settings.update", "school_settings", SCHOOL_SETTINGS_ID,
                { lat, lng, radius }
            );
            return res.status(200).json({
                lat: Number(rows[0].lat),
                lng: Number(rows[0].lng),
                radius: Number(rows[0].radius)
            });
        } catch (error) {
            console.error("School settings update failed:", error);
            return jsonSupabaseError(res, error, "Unable to save school location settings");
        }
    }

    res.setHeader("Allow", "GET, HEAD, PUT");
    return jsonError(res, 405, "Method not allowed");
}
