import { supabaseRequest } from "./supabase.js";

export const FEATURE_DEFAULTS = Object.freeze({
    camera_attendance: true,
    gps_geofencing: true,
    face_recognition: true,
    liveness_check: true,
    face_ambiguity_guard: true,
    face_enrollment: true,
    face_sample_limit: true,
    student_login: true,
    teacher_login: true,
    admin_login: true,
    student_account_creation: true,
    teacher_account_creation: true,
    account_deactivation: true,
    attendance_recording: true,
    duplicate_attendance_block: true,
    attendance_history: true,
    attendance_export: true,
    parent_notifications: true,
    late_detection: true,
    admin_audit_log: true,
    admin_account_export: true,
    admin_password_change: true,
    rate_limiting: true,
    session_expiry: true,
    origin_validation: true,
    maintenance_banner: false,
    reduced_motion_support: true,
    language_switcher: true,
    responsive_layout: true,
    splash_animation: true,
    gps_accuracy_guard: true,
    gps_boundary_guard: true,
    geofence_radius_edit: true,
    school_schedule_rules: true,
    privacy_notice: true,
    service_health_panel: true,
    strict_server_validation: true
});

// These controls protect data integrity, account security or accessibility. They are
// intentionally non-disableable from the Admin UI; switch them off only through a
// reviewed code change with an explicit migration and security review.
export const LOCKED_FEATURE_FLAGS = Object.freeze([
    "admin_audit_log",
    "duplicate_attendance_block",
    "face_ambiguity_guard",
    "gps_boundary_guard",
    "face_sample_limit",
    "gps_accuracy_guard",
    "rate_limiting",
    "session_expiry",
    "origin_validation",
    "strict_server_validation",
    "reduced_motion_support",
    "responsive_layout",
    "privacy_notice"
]);

export const PUBLIC_FEATURE_KEYS = Object.freeze([
    "camera_attendance",
    "gps_geofencing",
    "face_recognition",
    "liveness_check",
    "face_ambiguity_guard",
    "face_enrollment",
    "face_sample_limit",
    "student_account_creation",
    "attendance_recording",
    "duplicate_attendance_block",
    "attendance_history",
    "attendance_export",
    "parent_notifications",
    "late_detection",
    "gps_accuracy_guard",
    "gps_boundary_guard",
    "geofence_radius_edit",
    "school_schedule_rules",
    "privacy_notice",
    "service_health_panel",
    "maintenance_banner",
    "reduced_motion_support",
    "language_switcher",
    "responsive_layout",
    "splash_animation"
]);

export async function getFeatureFlags() {
    const rows = await supabaseRequest(
        "system_settings?id=eq.00000000-0000-0000-0000-000000000002&select=feature_flags&limit=1"
    );
    const stored = Array.isArray(rows) && rows[0]?.feature_flags &&
        typeof rows[0].feature_flags === "object" && !Array.isArray(rows[0].feature_flags)
        ? rows[0].feature_flags : {};
    const flags = Object.fromEntries(Object.keys(FEATURE_DEFAULTS).map(key => [
        key,
        typeof stored[key] === "boolean" ? stored[key] : FEATURE_DEFAULTS[key]
    ]));
    for (const key of LOCKED_FEATURE_FLAGS) flags[key] = true;
    return flags;
}

export function publicFeatureFlags(flags) {
    return Object.fromEntries(PUBLIC_FEATURE_KEYS.map(key => [key, flags[key] !== false]));
}

export function featureDisabled(res, feature, message = "This feature is disabled by the administrator") {
    return res.status(403).json({ error: message, feature });
}
