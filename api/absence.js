import {
    getRequestRole,
    getSession,
    isAllowedOrigin,
    jsonError,
    jsonSupabaseError,
    rateLimit,
    supabaseRequest,
    verifyTeacherSession
} from "./_lib/supabase.js";
import { sendWhatsApp } from "./_lib/whatsapp.js";
import { writeAuditLog } from "./_lib/audit.js";

const TYPES = new Set(["sick", "permission", "other"]);
const STATUSES = new Set(["approved", "rejected"]);

function normalizeRow(row) {
    const student = row.students || {};
    return {
        id: row.id,
        student_id: row.student_id,
        nisn: student.nisn || "",
        name: student.name || "",
        class_name: student.class_name || "",
        absence_date: row.absence_date,
        absence_type: row.absence_type,
        note: row.note,
        status: row.status,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at
    };
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    let role;
    try {
        role = await getRequestRole(req);
    } catch (error) {
        console.error("Absence request authorization failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate session");
    }
    const session = getSession(req);
    if (req.method === "GET") {
        if (role === "guru") {
            try {
                const rows = await supabaseRequest(
                    "absence_requests?select=*,students!inner(nisn,name,class_name)&order=created_at.desc&limit=500"
                );
                return res.status(200).json({ requests: rows.map(normalizeRow) });
            } catch (error) {
                console.error("Absence request list failed:", error);
                return jsonSupabaseError(res, error, "Unable to load absence requests");
            }
        }
        if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "A student or teacher session is required");
        try {
            const students = await supabaseRequest(
                "students?select=id&nisn=eq." + encodeURIComponent(session.nisn) + "&is_active=eq.true&limit=1"
            );
            if (!students.length) return jsonError(res, 404, "Student account was not found");
            const rows = await supabaseRequest(
                "absence_requests?select=*,students!inner(nisn,name,class_name)&student_id=eq." +
                encodeURIComponent(students[0].id) + "&order=created_at.desc&limit=100"
            );
            return res.status(200).json({ requests: rows.map(normalizeRow) });
        } catch (error) {
            console.error("Student absence request list failed:", error);
            return jsonSupabaseError(res, error, "Unable to load your absence requests");
        }
    }

    if (req.method === "POST") {
        if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "Only a signed-in student can submit an absence request");
        if (!rateLimit(req, "absence:POST:siswa", 5, 60_000, res)) return jsonError(res, 429, "Too many absence requests. Try again later.");
        const body = req.body || {};
        const date = typeof body.date === "string" ? body.date : "";
        const type = body.type;
        const note = typeof body.note === "string" ? body.note.trim() : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z"))) {
            return jsonError(res, 400, "Choose a valid absence date");
        }
        if (!TYPES.has(type)) return jsonError(res, 400, "Choose a valid absence type");
        if (!note || note.length > 1000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(note)) {
            return jsonError(res, 400, "The note must contain 1 to 1000 valid characters");
        }
        try {
            const students = await supabaseRequest(
                "students?select=id,nisn,name,class_name,parent_whatsapp&nisn=eq." +
                encodeURIComponent(session.nisn) + "&is_active=eq.true&limit=1"
            );
            if (!students.length) return jsonError(res, 404, "Student account was not found");
            const student = students[0];
            const existing = await supabaseRequest(
                "absence_requests?select=id,status&student_id=eq." + encodeURIComponent(student.id) +
                "&absence_date=eq." + encodeURIComponent(date) + "&status=eq.pending&limit=1"
            );
            if (existing.length) return jsonError(res, 409, "A pending request already exists for this date");
            const rows = await supabaseRequest("absence_requests?select=id,student_id,absence_date,absence_type,note,status,created_at", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    student_id: student.id,
                    absence_date: date,
                    absence_type: type,
                    note,
                    status: "pending"
                })
            });
            const row = rows[0];
            await writeAuditLog(session, "absence_request.create", "absence_requests", row?.id, {
                student_id: student.id, absence_date: date, absence_type: type
            });
            let whatsapp = { sent: false, skipped: !student.parent_whatsapp };
            if (student.parent_whatsapp) {
                const target = student.parent_whatsapp.replace(/\D/g, "").replace(/^08/, "628");
                const typeLabel = ({ sick: "sakit", permission: "izin", other: "lainnya" })[type];
                const message = "Amanah ID: pengajuan ketidakhadiran " + student.name +
                    " tanggal " + date + " (" + typeLabel + ") telah diterima dan menunggu peninjauan sekolah.";
                try {
                    await sendWhatsApp(target, message);
                    whatsapp = { sent: true, skipped: false };
                } catch (error) {
                    console.error("Absence WhatsApp notification failed:", error);
                    whatsapp = { sent: false, skipped: false, error: "WhatsApp notification failed" };
                }
            }
            return res.status(201).json({
                request: { ...row, nisn: student.nisn, name: student.name, class_name: student.class_name },
                whatsapp
            });
        } catch (error) {
            if (error?.code === "23505") return jsonError(res, 409, "A pending absence request already exists for this date");
            console.error("Absence request save failed:", error);
            return jsonSupabaseError(res, error, "Unable to save absence request");
        }
    }

    if (req.method === "PATCH") {
        try {
            if (!await verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
        } catch (error) {
            console.error("Absence review authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        const body = req.body || {};
        const id = typeof body.id === "string" ? body.id : "";
        const status = body.status;
        if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.has(status)) return jsonError(res, 400, "Invalid request id or review status");
        try {
            const rows = await supabaseRequest(
                "absence_requests?id=eq." + encodeURIComponent(id) + "&status=eq.pending&select=id,student_id,absence_date,absence_type,note,status,created_at",
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({ status, reviewed_at: new Date().toISOString(), reviewed_by: getSession(req)?.email || "teacher" })
                }
            );
            if (!rows.length) return jsonError(res, 409, "Request was already reviewed or no longer exists");
            await writeAuditLog(getSession(req), "absence_request.review", "absence_requests", id, { status });
            return res.status(200).json({ request: rows[0] });
        } catch (error) {
            console.error("Absence request review failed:", error);
            return jsonSupabaseError(res, error, "Unable to review absence request");
        }
    }
    res.setHeader("Allow", "GET, POST, PATCH");
    return jsonError(res, 405, "Method not allowed");
}
