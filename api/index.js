import { getMissingAuthConfiguration, supabaseRequest } from "./_lib/supabase.js";

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "HEAD") return res.status(200).end();
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET, HEAD");
        return res.status(405).json({ error: "Method not allowed", method: req.method });
    }
    if (req.query?.action === "features") {
        try {
            const rows = await supabaseRequest("system_settings?id=eq.00000000-0000-0000-0000-000000000002&select=feature_flags&limit=1");
            const stored = Array.isArray(rows) ? (rows[0]?.feature_flags || {}) : {};
            const defaults = {
                camera_attendance: true, gps_geofencing: true, face_recognition: true,
                liveness_check: true, face_enrollment: true, face_sample_limit: true,
                attendance_recording: true, duplicate_attendance_block: true, attendance_history: true,
                attendance_export: true, parent_notifications: true, late_detection: true,
                gps_accuracy_guard: true, geofence_radius_edit: true, school_schedule_rules: true,
                privacy_notice: true, service_health_panel: true, maintenance_banner: false,
                public_status_panel: true, language_switcher: true, responsive_layout: true, splash_animation: true
            };
            return res.status(200).json({ features: { ...defaults, ...Object.fromEntries(Object.keys(defaults).map(key => [key, typeof stored[key] === "boolean" ? stored[key] : defaults[key]])) } });
        } catch (error) {
            console.error("Runtime feature configuration failed:", error);
            return res.status(503).json({ error: "Runtime feature configuration is unavailable" });
        }
    }
    const missingConfiguration = getMissingAuthConfiguration();
    return res.status(200).json({
        ok: true,
        service: "Amanah.id API",
        runtime: process.version,
        authentication: {
            configured: missingConfiguration.length === 0,
            missing: missingConfiguration
        }
    });
}
