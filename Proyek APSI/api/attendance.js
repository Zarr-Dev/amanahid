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
import { sendWhatsApp } from "./_lib/whatsapp.js";
import { writeAuditLog } from "./_lib/audit.js";
import { validateSchema } from "./_lib/validate.js";

const MAX_ACCURACY = 35;
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

function normalizeAttendance(row) {
    const student = row.students || {};
    return {
        id: row.id,
        student_id: row.student_id,
        nisn: student.nisn,
        name: student.name,
        className: student.class_name,
        date: row.date,
        time: row.time,
        confidence: Number(row.confidence),
        method: row.method,
        created_at: row.created_at
    };
}

function failedAttendance(req, res, role, status, payload) {
    if (!rateLimit(req, `attendance:failed:${role}`, 6, 60_000, res)) {
        return jsonError(res, 429, "Too many failed attendance attempts. Try again in a minute.");
    }
    return res.status(status).json(payload);
}

export default async function handler(req, res) {
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    let role;
    try {
        role = await getRequestRole(req);
    } catch (error) {
        console.error("Attendance session validation failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate attendance session");
    }

    if (req.method === "GET") {
        if (role !== "guru" && role !== "siswa") return jsonError(res, 403, "A valid user role is required");
        try {
            let query = "attendance?select=id,student_id,date,time,confidence,method,created_at,students!inner(nisn,name,class_name)&order=date.desc,time.desc";
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
            return res.status(200).json({ attendance: rows.map(normalizeAttendance) });
        } catch (error) {
            console.error("Attendance query failed:", error);
            return jsonSupabaseError(res, error, "Unable to load attendance");
        }
    }

    if (req.method === "POST") {
        if (role !== "guru" && role !== "siswa") return jsonError(res, 403, "A valid user role is required");
        const body = req.body || {};
        const bodyValidation = validateSchema({
            nisn: { type: "string", required: true, max: 20, pattern: /^\d{8,20}$/ },
            lat: { type: "number", required: true, min: -90, max: 90 },
            lng: { type: "number", required: true, min: -180, max: 180 },
            accuracy: { type: "number", required: true, min: 0.01, max: 1_000_000 },
            confidence: { type: "number", required: true, min: 0.3, max: 1 }
        }, body);
        if (!bodyValidation.valid) return jsonError(res, 400, bodyValidation.error);
        const { nisn, lat, lng, accuracy, confidence } = body;
        if (typeof nisn !== "string" || !/^\d{8,20}$/.test(nisn)) {
            return jsonError(res, 400, "Invalid NISN");
        }
        if (![lat, lng, accuracy, confidence].every(value => typeof value === "number" && Number.isFinite(value)) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180 || accuracy <= 0 || confidence < 0.3 || confidence > 1) {
            return jsonError(res, 400, "Invalid location or confidence values");
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
            const repeated = await supabaseRequest(
                `attendance?select=id,student_id,date,time,confidence,method,created_at,students!inner(nisn,name,class_name)&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`
            );
            if (repeated.length) {
                if (repeated[0].students?.nisn !== nisn) {
                    return jsonError(res, 409, "Idempotency key has already been used");
                }
                return res.status(200).json({
                    attendance: normalizeAttendance(repeated[0]),
                    whatsapp: { sent: false, skipped: true }
                });
            }
            const settings = await supabaseRequest(
                "school_settings?select=lat,lng,radius&id=eq.00000000-0000-0000-0000-000000000001&limit=1"
            );
            if (!settings.length) return jsonError(res, 503, "School location settings are not configured");
            const school = {
                lat: Number(settings[0].lat),
                lng: Number(settings[0].lng),
                radius: Number(settings[0].radius)
            };
            if (![school.lat, school.lng, school.radius].every(Number.isFinite)) {
                console.error("School location settings contain invalid values");
                return jsonError(res, 503, "School location settings are invalid");
            }
            const distance = distanceMeters(school.lat, school.lng, lat, lng);
            if (accuracy > MAX_ACCURACY) {
                return failedAttendance(req, res, role, 400, {
                    error: "GPS_ACCURACY_TOO_LOW",
                    required: MAX_ACCURACY,
                    actual: accuracy
                });
            }
            if (distance > school.radius) {
                return failedAttendance(req, res, role, 403, {
                    error: `Attendance is outside the ${school.radius}-meter school geofence`
                });
            }

            const students = await supabaseRequest(
                `students?select=id,nisn,name,class_name,parent_whatsapp&is_active=eq.true&nisn=eq.${encodeURIComponent(nisn)}&limit=1`
            );
            if (!students.length) {
                return failedAttendance(req, res, role, 404, { error: "Student is not registered" });
            }
            const student = students[0];
            const { date, time } = jakartaDateTime();

            const existing = await supabaseRequest(
                `attendance?select=id,student_id,date,time,confidence,method,created_at,idempotency_key,students!inner(nisn,name,class_name)&student_id=eq.${encodeURIComponent(student.id)}&date=eq.${date}&limit=1`
            );
            if (existing.length) {
                if (existing[0].idempotency_key === idempotencyKey) {
                    return res.status(200).json({
                        attendance: normalizeAttendance(existing[0]),
                        whatsapp: { sent: false, skipped: true }
                    });
                }
                return failedAttendance(req, res, role, 409, {
                    error: "Attendance has already been recorded today"
                });
            }

            const inserted = await supabaseRequest(
                "attendance?select=id,student_id,date,time,confidence,method,created_at",
                {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        student_id: student.id,
                        date,
                        time,
                        confidence,
                        method: "face-gps",
                        idempotency_key: idempotencyKey
                    })
                }
                );
            await writeAuditLog(getSession(req), "attendance.create", "attendance", inserted[0]?.id, {
                student_id: student.id, date, method: "face-gps"
            });

            let whatsapp = { sent: false, skipped: !student.parent_whatsapp };
            if (student.parent_whatsapp) {
                const target = student.parent_whatsapp.replace(/\D/g, "").replace(/^08/, "628");
                const message = `Presensi ${student.name} (${student.nisn}) berhasil tercatat pada ${date} pukul ${time} di Al-Fityan School.`;
                try {
                    await sendWhatsApp(target, message);
                    whatsapp = { sent: true, skipped: false };
                } catch (error) {
                    console.error("Attendance WhatsApp notification failed:", error);
                    whatsapp = { sent: false, skipped: false, error: "WhatsApp notification failed" };
                }
            }

            return res.status(201).json({
                attendance: normalizeAttendance({ ...inserted[0], students: student }),
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
                            whatsapp: { sent: false, skipped: true }
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
            await supabaseRequest(`attendance${deleteAll ? "" : `?id=eq.${encodeURIComponent(id)}`}`, {
                method: "DELETE"
            });
            await writeAuditLog(session, "attendance.delete", "attendance", id || "all", {});
            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error("Attendance delete failed:", error);
            return jsonSupabaseError(res, error, "Unable to delete attendance");
        }
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return jsonError(res, 405, "Method not allowed");
}
