import {
    getRequestRole,
    getSession,
    isAllowedOrigin,
    jakartaDateTime,
    jsonError,
    jsonSupabaseError,
    rateLimit,
    supabaseRequest,
    verifyTeacherSession
} from "./_lib/supabase.js";
import { verifyToken } from "./_lib/admin-auth.js";
import { sendWhatsApp } from "./_lib/whatsapp.js";
import { writeAuditLog } from "./_lib/audit.js";
import { validateSchema } from "./_lib/validate.js";
import { getFeatureFlags, featureDisabled } from "./_lib/features.js";

const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function distanceMeters(lat1, lng1, lat2, lng2) {
    const radians = value => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLng = radians(lng2 - lng1);
    const rawA = Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
    const a = Math.min(1, Math.max(0, rawA));
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeAttendance(row, schedule = null, features = {}) {
    const student = row.students || {};
    return {
        id: row.id,
        student_id: row.student_id,
        nisn: student.nisn,
        name: student.name,
        className: student.class_name,
        date: row.date,
        time: row.time,
        confidence: row.confidence == null ? null : Number(row.confidence),
        status: features.late_detection && features.school_schedule_rules && schedule
            ? (isLate(row.time, schedule) ? "late" : "present") : null,
        method: row.method,
        created_at: row.created_at
    };
}

function isLate(time, schedule) {
    const toMinutes = value => {
        const [hours, minutes] = String(value || "00:00").slice(0, 5).split(":").map(Number);
        return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
    };
    return toMinutes(time) > toMinutes(schedule.entry_time) + Number(schedule.late_tolerance_min || 0);
}

function failedAttendance(req, res, role, status, payload) {
    if (!rateLimit(req, `attendance:failed:${role}`, 6, 60_000, res)) {
        return jsonError(res, 429, "Too many failed attendance attempts. Try again in a minute.");
    }
    return res.status(status).json(payload);
}

async function handleOfflinePendingRequest(req, res, session) {
    if (session?.role !== "siswa" || typeof session.nisn !== "string" || !/^\d{8,20}$/.test(session.nisn)) {
        return jsonError(res, 403, "Only an active student can submit an offline attendance request");
    }
    if (!rateLimit(req, "attendance:offline-pending", 3, 60_000, res)) {
        return jsonError(res, 429, "Too many offline attendance submissions. Try again shortly.");
    }
    const body = req.body || {};
    const validation = validateSchema({
        action: { type: "string", required: true, pattern: /^offline-pending$/ },
        event_id: { type: "string", required: true, max: 36, pattern: IDEMPOTENCY_KEY_PATTERN },
        claimed_at: { type: "number", required: true, min: 1_600_000_000_000, max: 2_200_000_000_000 },
        lat: { type: "number", required: true, min: -90, max: 90 },
        lng: { type: "number", required: true, min: -180, max: 180 },
        accuracy: { type: "number", required: true, min: 0.01, max: 1000 },
        gps_timestamp: { type: "number", required: true, min: 1_600_000_000_000, max: 2_200_000_000_000 },
        speed: { type: "number", required: true, min: 0, max: 55 },
        face_liveness_completed: { type: "boolean", required: true },
        face_model_key: { type: "string", required: true, max: 80 }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);
    if (body.face_liveness_completed !== true || body.face_model_key !== "auraface-glintr100-int8-v1") {
        return jsonError(res, 400, "A locally completed face/liveness session from the current model is required");
    }
    const now = Date.now();
    if (body.claimed_at > now + 120_000 || now - body.claimed_at > 4 * 60 * 60 * 1000) {
        return res.status(400).json({
            code: "OFFLINE_EVENT_EXPIRED",
            error: "Offline attendance requests must be synchronized within four hours of the device timestamp."
        });
    }
    if (Math.abs(body.claimed_at - body.gps_timestamp) > 60_000) {
        return jsonError(res, 400, "The GPS timestamp does not match the claimed attendance time");
    }
    if (body.speed > 55 || body.accuracy > 100) {
        return jsonError(res, 400, "The offline GPS fix is too imprecise or has implausible movement");
    }

    try {
        const features = await getFeatureFlags();
        if (features.attendance_recording === false || features.gps_geofencing === false ||
            features.camera_attendance === false || features.face_recognition === false ||
            features.liveness_check === false) {
            return jsonError(res, 403, "Offline attendance is disabled by the active attendance policy");
        }
        const students = await supabaseRequest(
            "students?select=id,nisn,name,class_name,is_active&is_active=eq.true&nisn=eq." +
            encodeURIComponent(session.nisn) + "&limit=1"
        );
        const student = students?.[0];
        if (!student) return jsonError(res, 403, "An active student account is required");

        const existingEvent = await supabaseRequest(
            "offline_attendance_events?select=id,event_id,status,student_id&event_id=eq." +
            encodeURIComponent(body.event_id) + "&limit=1"
        );
        if (Array.isArray(existingEvent) && existingEvent.length) {
            if (existingEvent[0].student_id !== student.id) {
                return jsonError(res, 409, "Offline event identifier has already been used");
            }
            return res.status(200).json({
                accepted: true,
                duplicate: true,
                status: existingEvent[0].status,
                event_id: existingEvent[0].event_id
            });
        }

        const settingsRows = await supabaseRequest(
            "school_settings?select=lat,lng,radius&id=eq.00000000-0000-0000-0000-000000000001&limit=1"
        );
        const settings = Array.isArray(settingsRows) ? settingsRows[0] : null;
        if (!settings) return jsonError(res, 503, "School GPS settings are not configured");
        const school = { lat: Number(settings.lat), lng: Number(settings.lng), radius: Number(settings.radius) };
        if (![school.lat, school.lng, school.radius].every(Number.isFinite) ||
            school.lat < -90 || school.lat > 90 || school.lng < -180 || school.lng > 180 ||
            school.radius < 10 || school.radius > 500) {
            return jsonError(res, 503, "School GPS settings are invalid");
        }
        const distance = distanceMeters(school.lat, school.lng, body.lat, body.lng);
        if (!Number.isFinite(distance) || body.accuracy > school.radius) {
            return jsonError(res, 400, "Offline GPS quality is not sufficient for geofence validation");
        }
        if (distance + body.accuracy > school.radius) {
            return res.status(403).json({
                code: "OFFLINE_GPS_BOUNDARY_UNCERTAIN",
                error: "The offline GPS uncertainty range overlaps the school geofence boundary."
            });
        }

        const claimedTime = jakartaDateTime(new Date(body.claimed_at));
        const dayStart = new Date(claimedTime.date + "T00:00:00+07:00").toISOString();
        const nextDay = new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString();
        const [sameDayAttendance, sameDayPending] = await Promise.all([
            supabaseRequest(
                "attendance?select=id&student_id=eq." + encodeURIComponent(student.id) +
                "&date=eq." + claimedTime.date + "&limit=1"
            ),
            supabaseRequest(
                "offline_attendance_events?select=id,event_id&student_id=eq." +
                encodeURIComponent(student.id) + "&status=eq.pending_review&school_date=eq." +
                claimedTime.date + "&limit=1"
            )
        ]);
        if (Array.isArray(sameDayAttendance) && sameDayAttendance.length) {
            return jsonError(res, 409, "Attendance is already recorded for this school date");
        }
        if (Array.isArray(sameDayPending) && sameDayPending.length) {
            return res.status(409).json({
                code: "OFFLINE_REQUEST_ALREADY_PENDING",
                error: "A pending offline attendance request already exists for this school date."
            });
        }

        const inserted = await supabaseRequest(
            "offline_attendance_events?select=id,event_id,status,claimed_at,received_at",
            {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    event_id: body.event_id,
                    student_id: student.id,
                    claimed_at: new Date(body.claimed_at).toISOString(),
                    school_date: claimedTime.date,
                    gps_lat: body.lat,
                    gps_lng: body.lng,
                    gps_accuracy: body.accuracy,
                    gps_timestamp: new Date(body.gps_timestamp).toISOString(),
                    face_liveness_completed: true,
                    face_model_key: body.face_model_key,
                    status: "pending_review"
                })
            }
        );
        const event = Array.isArray(inserted) ? inserted[0] : null;
        if (!event) return jsonError(res, 503, "Offline attendance request could not be stored");
        await writeAuditLog(session, "attendance.offline_pending", "offline_attendance_events", event.id, {
            student_id: student.id,
            event_id: body.event_id,
            gps_distance_m: Math.round(distance),
            gps_accuracy_m: Math.round(body.accuracy),
            face_liveness: "client_reported_not_server_verified"
        });
        return res.status(202).json({
            accepted: true,
            official_attendance: false,
            status: "pending_review",
            event_id: body.event_id,
            message: "Offline attendance request stored for manual review. It is not an official attendance record yet."
        });
    } catch (error) {
        if (error?.code === "23505") {
            return jsonError(res, 409, "An offline request or official attendance record already exists for this event");
        }
        console.error("Offline attendance request failed:", error);
        return jsonSupabaseError(res, error, "Unable to store offline attendance request. Apply migration 20261105090000 first.");
    }
}

async function listOfflinePendingRequests(req, res, role) {
    if (role !== "admin" && role !== "guru") return jsonError(res, 403, "Admin or teacher role is required");
    try {
        let teacherFilter = "";
        if (role === "guru") {
            const teacherRows = await supabaseRequest(
                "teachers?select=id&email=eq." + encodeURIComponent(getSession(req)?.email || "") + "&is_active=eq.true&limit=1"
            );
            const teacher = teacherRows?.[0];
            if (!teacher) return jsonError(res, 403, "An active teacher account is required");
            teacherFilter = "&student.homeroom_teacher_id=eq." + encodeURIComponent(teacher.id);
        }
        const rows = await supabaseRequest(
            "offline_attendance_events?select=id,event_id,claimed_at,gps_lat,gps_lng,gps_accuracy,gps_timestamp,face_liveness_completed,face_model_key,status,received_at,student:students!inner(id,nisn,name,class_name,homeroom_teacher_id)&status=eq.pending_review&order=received_at.desc&limit=100" +
            teacherFilter
        );
        const items = Array.isArray(rows) ? rows : [];
        return res.status(200).json({
            pending: items.map(item => ({
                id: item.id,
                event_id: item.event_id,
                claimed_at: item.claimed_at,
                gps: { lat: Number(item.gps_lat), lng: Number(item.gps_lng), accuracy: Number(item.gps_accuracy) },
                received_at: item.received_at,
                face_liveness_client_reported: item.face_liveness_completed === true,
                face_model_key: item.face_model_key,
                status: item.status,
                student: item.student
            }))
        });
    } catch (error) {
        console.error("Offline attendance review queue failed:", error);
        return jsonSupabaseError(res, error, "Unable to load offline attendance queue. Apply migration 20261105090000 first.");
    }
}

async function reviewOfflineAttendance(req, res, role, session) {
    if (role !== "admin" && role !== "guru") return jsonError(res, 403, "Admin or teacher role is required");
    if (!rateLimit(req, "attendance:offline-review", 20, 60_000, res)) {
        return jsonError(res, 429, "Too many offline attendance review actions");
    }
    const body = req.body || {};
    const validation = validateSchema({
        action: { type: "string", required: true, pattern: /^offline-review$/ },
        id: { type: "string", required: true, max: 36, pattern: IDEMPOTENCY_KEY_PATTERN },
        decision: { type: "string", required: true, pattern: /^(approve|reject)$/ },
        notes: { type: "string", required: true, min: 8, max: 500 }
    }, body);
    if (!validation.valid) return jsonError(res, 400, validation.error);

    try {
        const rows = await supabaseRequest(
            "offline_attendance_events?select=id,event_id,student_id,claimed_at,school_date,status,student:students!inner(id,nisn,name,class_name,is_active,homeroom_teacher_id,parent_whatsapp)&id=eq." +
            encodeURIComponent(body.id) + "&limit=1"
        );
        const event = Array.isArray(rows) ? rows[0] : null;
        if (!event) return jsonError(res, 404, "Offline attendance request was not found");
        if (event.status !== "pending_review") {
            return jsonError(res, 409, "This offline attendance request has already been reviewed");
        }

        let teacherId = null;
        if (role === "guru") {
            const teacherRows = await supabaseRequest(
                "teachers?select=id&email=eq." + encodeURIComponent(session?.email || "") +
                "&is_active=eq.true&limit=1"
            );
            const teacher = teacherRows?.[0];
            if (!teacher || event.student?.homeroom_teacher_id !== teacher.id) {
                return jsonError(res, 403, "Teachers can review only students in their homeroom");
            }
            teacherId = teacher.id;
        }

        const rpcResult = await supabaseRequest("rpc/review_offline_attendance_event", {
            method: "POST",
            body: JSON.stringify({
                p_event_id: event.event_id,
                p_decision: body.decision,
                p_review_notes: body.notes.trim(),
                p_reviewed_by: session.email,
                p_actor_role: role,
                p_teacher_id: teacherId
            })
        });
        const reviewed = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
        if (!reviewed || reviewed.status !== (body.decision === "approve" ? "approved" : "rejected")) {
            return jsonError(res, 503, "The database did not confirm the offline attendance review");
        }

        let whatsapp = { sent: false, accepted: false, queued: false, delivered: false, skipped: true };
        if (reviewed.official_attendance === true && reviewed.parent_whatsapp) {
            try {
                const target = String(reviewed.parent_whatsapp).replace(/\D/g, "").replace(/^08/, "628");
                const message = "Presensi offline " + reviewed.name + " (" + reviewed.nisn +
                    ") telah diverifikasi sekolah pada " + reviewed.attendance_date +
                    " pukul " + String(reviewed.attendance_time || "").slice(0, 8) + ".";
                const providerResult = await sendWhatsApp(target, message);
                whatsapp = {
                    sent: false, accepted: true, queued: true, delivered: false, skipped: false,
                    process: providerResult?.process || "pending", request_id: providerResult?.requestid ?? null
                };
            } catch (error) {
                console.error("Offline attendance parent notification failed:", error);
                whatsapp = { sent: false, skipped: false, error: "WhatsApp notification failed" };
            }
        }

        let attendance = null;
        if (reviewed.official_attendance === true && reviewed.attendance_id) {
            attendance = {
                id: reviewed.attendance_id,
                student_id: reviewed.student_id,
                date: reviewed.attendance_date,
                time: String(reviewed.attendance_time || "").slice(0, 8),
                confidence: null,
                method: "offline-reviewed",
                created_at: new Date().toISOString(),
                students: {
                    id: reviewed.student_id,
                    nisn: reviewed.nisn,
                    name: reviewed.name,
                    class_name: reviewed.class_name
                }
            };
        }

        return res.status(200).json({
            ok: true,
            status: reviewed.status,
            official_attendance: reviewed.official_attendance === true,
            attendance: attendance ? normalizeAttendance(attendance) : null,
            whatsapp,
            audit_recorded: true
        });
    } catch (error) {
        if (error?.code === "23505") {
            return jsonError(res, 409, "An official attendance record already exists for this student and school date");
        }
        if (error?.code === "P0002") return jsonError(res, 404, "Offline attendance request or student was not found");
        if (error?.code === "42501") return jsonError(res, 403, error.message);
        console.error("Offline attendance review failed:", error);
        return jsonSupabaseError(res, error, "Unable to review offline attendance. Check migration 20261105090000.");
    }
}


export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    let role;
    try {
        role = await getRequestRole(req);
    } catch (error) {
        console.error("Attendance session validation failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate attendance session");
    }

    if (req.method === "GET" && req.query?.action === "offline-pending") {
        return listOfflinePendingRequests(req, res, role);
    }

    if (req.method === "GET") {
        if (role !== "guru" && role !== "siswa") return jsonError(res, 403, "A valid user role is required");
        try {
            const features = await getFeatureFlags();
            if (!features.attendance_history) return featureDisabled(res, "attendance_history", "Riwayat presensi sedang dinonaktifkan");
            const settingsRows = await supabaseRequest("school_settings?select=entry_time,late_tolerance_min&limit=1");
            const schedule = Array.isArray(settingsRows) ? settingsRows[0] : null;
            let query = "attendance?select=id,student_id,date,time,confidence,method,created_at,students!inner(nisn,name,class_name,homeroom_teacher_id)&order=date.desc,time.desc";
            if (role === "guru") {
                const teacherRows = await supabaseRequest(
                    "teachers?select=id&email=eq." + encodeURIComponent(getSession(req)?.email || "") + "&is_active=eq.true&limit=1"
                );
                const teacher = teacherRows?.[0];
                if (!teacher) return jsonError(res, 403, "An active teacher account is required");
                query += "&students.homeroom_teacher_id=eq." + encodeURIComponent(teacher.id);
            }
            if (role === "siswa") {
                const nisn = getSession(req)?.nisn;
                if (typeof nisn !== "string" || !/^\d{8,20}$/.test(nisn)) {
                    return jsonError(res, 403, "Student NISN is required");
                }
                const students = await supabaseRequest(
                    `students?select=id&is_active=eq.true&nisn=eq.${encodeURIComponent(nisn)}&limit=1`
                );
                if (!students.length) return res.status(200).json({ attendance: [] });
                query += `&student_id=eq.${encodeURIComponent(students[0].id)}`;
            }
            const rows = await supabaseRequest(query);
            return res.status(200).json({ attendance: rows.map(row => normalizeAttendance(row, schedule, features)) });
        } catch (error) {
            console.error("Attendance query failed:", error);
            return jsonSupabaseError(res, error, "Unable to load attendance");
        }
    }

    if (req.method === "POST") {
        if (req.body?.action === "offline-pending") {
            if (role !== "siswa") return jsonError(res, 403, "Only a student can submit their own offline attendance request");
            return handleOfflinePendingRequest(req, res, getSession(req));
        }
        if (req.body?.action === "offline-review") {
            return reviewOfflineAttendance(req, res, role, getSession(req));
        }
        if (role !== "guru" && role !== "siswa") return jsonError(res, 403, "A valid user role is required");
        const body = req.body || {};
        const session = getSession(req);
        const faceProof = verifyToken(req.headers["x-face-proof"]);
        if (!faceProof || (role !== "siswa" && role !== "guru") ||
            faceProof.purpose !== "attendance_face" ||
            faceProof.faceVerified !== true ||
            faceProof.role !== role ||
            faceProof.email !== session?.email ||
            faceProof.nisn !== body.nisn ||
            typeof faceProof.confidence !== "number" ||
            !Number.isFinite(faceProof.confidence) ||
            faceProof.confidence < 0.3 ||
            faceProof.confidence > 1) {
            return jsonError(res, 403, "A valid recent server-verified face match is required");
        }
        let features;
        try {
            features = await getFeatureFlags();
        } catch (error) {
            console.error("Attendance feature configuration failed:", error);
            return jsonError(res, 503, "Attendance policy could not be loaded");
        }
        const gpsGeofencingEnabled = features.gps_geofencing !== false;
        const attendanceSchema = {
            nisn: { type: "string", required: true, max: 20, pattern: /^\d{8,20}$/ },
            confidence: { type: "number", min: 0.3, max: 1 }
        };
        if (gpsGeofencingEnabled) {
            Object.assign(attendanceSchema, {
                lat: { type: "number", required: true, min: -90, max: 90 },
                lng: { type: "number", required: true, min: -180, max: 180 },
                accuracy: { type: "number", required: true, min: 0.01, max: 1_000_000 },
                gpsTimestamp: { type: "number", required: true, min: 1_600_000_000_000, max: 2_200_000_000_000 },
                speed: { type: "number", required: true, min: 0, max: 55 }
            });
        }
        const bodyValidation = validateSchema(attendanceSchema, body);
        if (!bodyValidation.valid) return jsonError(res, 400, bodyValidation.error);
        const { nisn, lat, lng, accuracy, gpsTimestamp, speed, confidence } = body;
        if (typeof nisn !== "string" || !/^\d{8,20}$/.test(nisn)) {
            return jsonError(res, 400, "Invalid NISN");
        }
        if (gpsGeofencingEnabled && (
            ![lat, lng, accuracy, gpsTimestamp, speed].every(value => typeof value === "number" && Number.isFinite(value)) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180 || accuracy <= 0 || speed < 0 || speed > 55
        )) {
            return jsonError(res, 400, "Invalid location values");
        }
        if (confidence !== undefined && (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0.3 || confidence > 1)) {
            return jsonError(res, 400, "Invalid face confidence value");
        }
        if (gpsGeofencingEnabled && Math.abs(Date.now() - gpsTimestamp) > 30_000) {
            return failedAttendance(req, res, role, 400, { error: "GPS_FIX_STALE", message: "Location data is stale. Check GPS again." });
        }
        if (gpsGeofencingEnabled && speed > 55) {
            return failedAttendance(req, res, role, 400, { error: "GPS_SPEED_ANOMALY", message: "Location movement looks implausible." });
        }
        if (role === "siswa" && getSession(req)?.nisn !== nisn) {
            return jsonError(res, 403, "Students can only record their own attendance");
        }
        const idempotencyKey = req.headers["x-idempotency-key"];
        if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
            return jsonError(res, 400, "A valid X-Idempotency-Key UUID is required");
        }
        const maxPerMinute = role === "siswa" ? 10 : role === "guru" ? 30 : 60;
        if (!rateLimit(req, `attendance:POST:${role}`, maxPerMinute, 60_000, res)) {
            return jsonError(res, 429, "Too many attendance attempts. Try again in a minute.");
        }

        try {
            const requiredFeatures = [
                "attendance_recording", "camera_attendance",
                "face_recognition", "liveness_check", "face_ambiguity_guard"
            ];
            if (gpsGeofencingEnabled) requiredFeatures.push("gps_geofencing", "gps_accuracy_guard", "gps_boundary_guard");
            const disabledFeature = requiredFeatures.find(key => features[key] === false);
            if (disabledFeature) return res.status(403).json({ error: "Attendance is disabled by the administrator", feature: disabledFeature });
            const repeated = await supabaseRequest(
                `attendance?select=id,student_id,date,time,confidence,method,created_at,students!inner(nisn,name,class_name)&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`
            );
            if (repeated.length) {
                if (repeated[0].students?.nisn !== nisn) {
                    return jsonError(res, 409, "Idempotency key has already been used");
                }
                return res.status(200).json({
                    attendance: normalizeAttendance(repeated[0]),
                    whatsapp: { sent: false, accepted: false, queued: false, delivered: false, skipped: true }
                });
            }
            const settingsRows = await supabaseRequest(
                `school_settings?select=${gpsGeofencingEnabled ? "lat,lng,radius," : ""}entry_time,late_tolerance_min,timezone&id=eq.00000000-0000-0000-0000-000000000001&limit=1`
            );
            const settings = Array.isArray(settingsRows) ? settingsRows[0] : null;
            if (!settings) return jsonError(res, 503, "School settings are not configured");
            if (gpsGeofencingEnabled) {
                const school = {
                    lat: Number(settings.lat),
                    lng: Number(settings.lng),
                    radius: Number(settings.radius)
                };
                if (![school.lat, school.lng, school.radius].every(Number.isFinite) ||
                    school.lat < -90 || school.lat > 90 ||
                    school.lng < -180 || school.lng > 180 ||
                    school.radius < 10 || school.radius > 500) {
                    console.error("School location settings contain invalid values");
                    return jsonError(res, 503, "School location settings are invalid");
                }
                const distance = distanceMeters(school.lat, school.lng, lat, lng);
                if (!Number.isFinite(distance)) {
                    return jsonError(res, 400, "GPS coordinates could not be validated");
                }
                if (features.gps_accuracy_guard && accuracy > school.radius) {
                    return failedAttendance(req, res, role, 400, {
                        error: "GPS_ACCURACY_TOO_LOW",
                        required: school.radius,
                        actual: accuracy
                    });
                }
                if (features.gps_boundary_guard &&
                    distance - accuracy <= school.radius &&
                    distance + accuracy > school.radius) {
                    return failedAttendance(req, res, role, 400, {
                        error: "GPS_BOUNDARY_UNCERTAIN",
                        radius: school.radius,
                        distance: Math.round(distance),
                        accuracy: Math.round(accuracy),
                        message: "The GPS uncertainty range overlaps the school geofence boundary. Refresh location from a clearer position."
                    });
                }
                if (distance > school.radius) {
                    return failedAttendance(req, res, role, 403, {
                        error: `Attendance is outside the ${school.radius}-meter school geofence`
                    });
                }
            }

            const students = await supabaseRequest(
                `students?select=id,nisn,name,class_name,parent_whatsapp,homeroom_teacher_id&is_active=eq.true&nisn=eq.${encodeURIComponent(nisn)}&limit=1`
            );
            if (!students.length) {
                return failedAttendance(req, res, role, 404, { error: "Student is not registered" });
            }
            const student = students[0];
            if (role === "guru") {
                const teacherRows = await supabaseRequest(
                    "teachers?select=id&email=eq." + encodeURIComponent(session?.email || "") + "&is_active=eq.true&limit=1"
                );
                const teacher = teacherRows?.[0];
                if (!teacher || student.homeroom_teacher_id !== teacher.id) {
                    return jsonError(res, 403, "Teachers can only record attendance for students in their homeroom");
                }
            }
            const { date, time } = jakartaDateTime();

            const existing = await supabaseRequest(
                `attendance?select=id,student_id,date,time,confidence,method,created_at,idempotency_key,students!inner(nisn,name,class_name)&student_id=eq.${encodeURIComponent(student.id)}&date=eq.${date}&limit=1`
            );
            if (existing.length) {
                if (existing[0].idempotency_key === idempotencyKey) {
                    return res.status(200).json({
                        attendance: normalizeAttendance(existing[0], settings, features),
                        whatsapp: { sent: false, accepted: false, queued: false, delivered: false, skipped: true }
                    });
                }
                return failedAttendance(req, res, role, 409, {
                    error: "Attendance has already been recorded today"
                });
            }

            const attendanceMethod = gpsGeofencingEnabled ? "face-gps" : "face";
            const inserted = await supabaseRequest(
                "attendance?select=id,student_id,date,time,confidence,method,created_at",
                {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        student_id: student.id,
                        date,
                        time,
                        confidence: faceProof.confidence,
                        method: attendanceMethod,
                        idempotency_key: idempotencyKey
                    })
                }
            );
            await writeAuditLog(getSession(req), "attendance.create", "attendance", inserted[0]?.id, {
                student_id: student.id, date, method: attendanceMethod
            });

            let whatsapp = {
                sent: false, accepted: false, queued: false, delivered: false,
                skipped: !student.parent_whatsapp || !features.parent_notifications,
                reason: features.parent_notifications ? undefined : "disabled_by_admin"
            };
            if (student.parent_whatsapp && features.parent_notifications) {
                const target = student.parent_whatsapp.replace(/\D/g, "").replace(/^08/, "628");
                const message = `Presensi ${student.name} (${student.nisn}) berhasil tercatat pada ${date} pukul ${time} di Al-Fityan School.`;
                try {
                    const providerResult = await sendWhatsApp(target, message);
                    whatsapp = {
                        sent: false, accepted: true, queued: true, delivered: false, skipped: false,
                        process: providerResult?.process || "pending", request_id: providerResult?.requestid ?? null
                    };
                } catch (error) {
                    console.error("Attendance WhatsApp notification failed:", error);
                    whatsapp = { sent: false, skipped: false, error: "WhatsApp notification failed" };
                }
            }

            return res.status(201).json({
                attendance: normalizeAttendance({ ...inserted[0], students: student }, settings, features),
                whatsapp
            });
        } catch (error) {
            if (error.code === "23505") {
                try {
                    const repeated = await supabaseRequest(
                        `attendance?select=id,student_id,date,time,confidence,method,created_at,students!inner(nisn,name,class_name)&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`
                    );
                    if (repeated.length && repeated[0].students?.nisn === nisn) {
                        return res.status(200).json({
                            attendance: normalizeAttendance(repeated[0]),
                            whatsapp: { sent: false, accepted: false, queued: false, delivered: false, skipped: true }
                        });
                    }
                } catch (lookupError) {
                    console.error("Attendance idempotency lookup failed:", lookupError);
                    return jsonSupabaseError(res, lookupError, "Unable to confirm attendance status");
                }
                return jsonError(res, 409, "Attendance has already been recorded today");
            }
            console.error("Attendance insert failed:", error);
            return jsonSupabaseError(res, error, "Unable to record attendance");
        }
    }

    if (req.method === "DELETE") {
        if (req.query?.all === "1") {
            return jsonError(res, 403, "Bulk attendance deletion is disabled. Correct individual records instead.");
        }
        try {
            if (!await verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        } catch (error) {
            console.error("Attendance deletion authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        const id = req.query?.id;
        const deleteAll = req.query?.all === "1";
        if (!deleteAll && (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
            return jsonError(res, 400, "A valid attendance ID is required");
        }
        try {
            const session = getSession(req);
            const teacherRows = await supabaseRequest(
                "teachers?select=id&email=eq." + encodeURIComponent(session?.email || "") + "&is_active=eq.true&limit=1"
            );
            const teacher = teacherRows?.[0];
            if (!teacher) return jsonError(res, 403, "An active teacher account is required");
            if (deleteAll) return jsonError(res, 403, "Bulk attendance deletion is disabled. Correct individual records instead.");
            const scopedRows = await supabaseRequest(
                `attendance?select=id,students!inner(homeroom_teacher_id)&id=eq.${encodeURIComponent(id)}&limit=1`
            );
            if (!scopedRows.length || scopedRows[0]?.students?.homeroom_teacher_id !== teacher.id) {
                return jsonError(res, 404, "Attendance record was not found in your homeroom");
            }
            await supabaseRequest(`attendance?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
            await writeAuditLog(session, "attendance.delete", "attendance", id, { teacher_id: teacher.id });
            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error("Attendance delete failed:", error);
            return jsonSupabaseError(res, error, "Unable to delete attendance");
        }
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return jsonError(res, 405, "Method not allowed");
}
