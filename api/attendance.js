import {
    getRequestRole,
    isAllowedOrigin,
    jakartaDateTime,
    jsonError,
    rateLimit,
    supabaseRequest,
    verifyTeacherSession
} from "../lib/supabase.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

const MAX_ACCURACY = 35;

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

export default async function handler(req, res) {
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    const role = getRequestRole(req);

    if (req.method === "GET") {
        if (!role) return jsonError(res, 403, "A valid user role is required");
        try {
            let query = "attendance?select=id,student_id,date,time,confidence,method,created_at,students!inner(nisn,name,class_name)&order=date.desc,time.desc";
            if (role === "siswa") {
                const nisn = req.headers["x-nisn"];
                if (typeof nisn !== "string" || !/^\d{8,20}$/.test(nisn)) {
                    return jsonError(res, 403, "Student NISN is required");
                }
                const students = await supabaseRequest(`students?select=id&nisn=eq.${encodeURIComponent(nisn)}&limit=1`);
                if (!students.length) return res.status(200).json({ attendance: [] });
                query += `&student_id=eq.${encodeURIComponent(students[0].id)}`;
            }
            const rows = await supabaseRequest(query);
            return res.status(200).json({ attendance: rows.map(normalizeAttendance) });
        } catch (error) {
            console.error("Attendance query failed:", error);
            return jsonError(res, 500, "Unable to load attendance");
        }
    }

    if (req.method === "POST") {
        if (!role) return jsonError(res, 403, "A valid user role is required");
        if (!rateLimit(req, "attendance:POST", 5, 60_000)) {
            return jsonError(res, 429, "Too many attendance attempts. Try again in a minute.");
        }
        const { nisn, lat, lng, accuracy, confidence } = req.body || {};
        if (typeof nisn !== "string" || !/^\d{8,20}$/.test(nisn)) {
            return jsonError(res, 400, "Invalid NISN");
        }
        if (![lat, lng, accuracy, confidence].every(value => typeof value === "number" && Number.isFinite(value)) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180 || accuracy <= 0 || confidence < 0.3 || confidence > 1) {
            return jsonError(res, 400, "Invalid location or confidence values");
        }
        if (role === "siswa" && req.headers["x-nisn"] !== nisn) {
            return jsonError(res, 403, "Students can only record their own attendance");
        }

        try {
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
                return jsonError(res, 400, `GPS accuracy must be ${MAX_ACCURACY} meters or better`);
            }
            if (distance > school.radius) {
                return jsonError(res, 403, `Attendance is outside the ${school.radius}-meter school geofence`);
            }

            const students = await supabaseRequest(
                `students?select=id,nisn,name,class_name,parent_whatsapp&nisn=eq.${encodeURIComponent(nisn)}&limit=1`
            );
            if (!students.length) return jsonError(res, 404, "Student is not registered");
            const student = students[0];
            const { date, time } = jakartaDateTime();

            const existing = await supabaseRequest(
                `attendance?select=id&student_id=eq.${encodeURIComponent(student.id)}&date=eq.${date}&limit=1`
            );
            if (existing.length) return jsonError(res, 409, "Attendance has already been recorded today");

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
                        method: "face-gps"
                    })
                }
            );

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
            if (error.code === "23505") return jsonError(res, 409, "Attendance has already been recorded today");
            console.error("Attendance insert failed:", error);
            return jsonError(res, 500, "Unable to record attendance");
        }
    }

    if (req.method === "DELETE") {
        if (!verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        const id = req.query?.id;
        const deleteAll = req.query?.all === "1";
        if (!deleteAll && (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
            return jsonError(res, 400, "A valid attendance ID is required");
        }
        try {
            await supabaseRequest(`attendance${deleteAll ? "" : `?id=eq.${encodeURIComponent(id)}`}`, {
                method: "DELETE"
            });
            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error("Attendance delete failed:", error);
            return jsonError(res, 500, "Unable to delete attendance");
        }
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return jsonError(res, 405, "Method not allowed");
}
