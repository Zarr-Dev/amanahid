import { randomUUID } from "node:crypto";
import {
    getRequestRole,
    getSession,
    isAllowedOrigin,
    jsonError,
    jsonSupabaseError,
    rateLimit,
    supabaseRequest,
    verifyAdminSession,
    jakartaDateTime
} from "./_lib/supabase.js";
import { sendWhatsApp } from "./_lib/whatsapp.js";
import { writeAuditLog } from "./_lib/audit.js";

const TYPES = new Set(["sick", "permission", "other", "dispensation"]);
const STATUSES = new Set(["approved", "rejected", "revoked"]);
const SICK_SEVERITIES = new Set(["mild", "moderate", "severe"]);
const MAX_MEDICAL_FILE_BYTES = 5 * 1024 * 1024;
const MEDICAL_FILE_TYPES = new Map([
    ["application/pdf", "pdf"],
    ["image/jpeg", "jpg"],
    ["image/png", "png"]
]);

function encodeStoragePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
}

function storageCredentials() {
    const base = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!base || !secret) throw new Error("Supabase Storage is not configured");
    return { base: base.replace(/\/+$/, ""), secret };
}

async function storageRequest(path, options = {}) {
    const { base, secret } = storageCredentials();
    const response = await fetch(`${base}/storage/v1${path}`, {
        ...options,
        headers: {
            apikey: secret,
            Authorization: `Bearer ${secret}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        },
        signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) {
        const error = new Error("Supabase Storage request failed");
        error.status = response.status;
        throw error;
    }
    return response;
}

async function createSignedStorageUrl(path, body) {
    const response = await storageRequest(path, {
        method: "POST",
        body: JSON.stringify(body)
    });
    const payload = await response.json();
    const candidate = payload?.signedURL || payload?.signedUrl || payload?.url;
    if (typeof candidate !== "string" || !candidate) throw new Error("Storage did not return a signed URL");
    const { base } = storageCredentials();
    const signedUrl = new URL(candidate, `${base}/storage/v1/`);
    if (typeof payload.token === "string" && !signedUrl.searchParams.has("token")) {
        signedUrl.searchParams.set("token", payload.token);
    }
    return signedUrl.toString();
}

async function getStudentForSession(session) {
    if (!session?.nisn) return null;
    const rows = await supabaseRequest(
        "students?select=id,nisn,name,class_name,parent_whatsapp,homeroom_teacher_id&nisn=eq." +
        encodeURIComponent(session.nisn) + "&is_active=eq.true&limit=1"
    );
    return rows?.[0] || null;
}

async function getTeacherForSession(session) {
    if (!session?.email) return null;
    const rows = await supabaseRequest(
        "teachers?select=id,name,email,homeroom_class&email=eq." +
        encodeURIComponent(session.email) + "&is_active=eq.true&limit=1"
    );
    return rows?.[0] || null;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
    const radians = value => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLng = radians(lng2 - lng1);
    const rawA = Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
    const a = Math.min(1, Math.max(0, rawA));
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
        severity: row.severity || null,
        note: row.note,
        status: row.status,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by || null,
        medical_evidence_uploaded: Boolean(row.medical_evidence_path)
    };
}

async function inspectMedicalEvidenceUpload(studentId, requestId, objectPath) {
    const prefix = String(studentId) + "/" + String(requestId) + "/";
    const filename = typeof objectPath === "string" && objectPath.startsWith(prefix) ? objectPath.slice(prefix.length) : "";
    if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(filename)) return { error: "Invalid medical evidence reference" };
    const infoResponse = await storageRequest("/object/info/medical-evidence/" + encodeStoragePath(objectPath), { method: "GET" });
    const info = await infoResponse.json();
    const actualSize = Number(info?.size ?? info?.metadata?.size);
    const actualType = String(info?.mimetype ?? info?.contentType ?? info?.metadata?.mimetype ?? "").toLowerCase();
    if (!Number.isSafeInteger(actualSize) || actualSize < 1 || actualSize > MAX_MEDICAL_FILE_BYTES || !MEDICAL_FILE_TYPES.has(actualType)) {
        return { error: "Uploaded file type or size is not allowed" };
    }
    if (!filename.toLowerCase().endsWith("." + MEDICAL_FILE_TYPES.get(actualType))) return { error: "Uploaded file extension does not match its content type" };
    return { objectPath, actualSize, actualType };
}

async function signMedicalEvidenceUpload(req, res, session, body) {
    const student = await getStudentForSession(session);
    if (!student) return jsonError(res, 404, "Student account was not found");
    if (!student.homeroom_teacher_id) {
        return jsonError(res, 409, "Akun siswa belum ditautkan ke wali kelas. Hubungi Admin sebelum mengirim surat sakit.");
    }
    const requestId = typeof body.request_id === "string" ? body.request_id : "";
    const mimeType = typeof body.mime_type === "string" ? body.mime_type.toLowerCase() : "";
    const fileSize = Number(body.file_size);
    const extension = MEDICAL_FILE_TYPES.get(mimeType);
    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !extension || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_MEDICAL_FILE_BYTES) {
        return jsonError(res, 400, "Choose a PDF, JPG, or PNG file up to 5 MB");
    }
    const objectPath = student.id + "/" + requestId + "/" + randomUUID() + "." + extension;
    const uploadUrl = await createSignedStorageUrl("/object/upload/sign/medical-evidence/" + encodeStoragePath(objectPath), {});
    return res.status(200).json({ upload_url: uploadUrl, path: objectPath, request_id: requestId, expires_in: 7200 });
}
async function viewMedicalEvidence(req, res, role, session, body) {
    if (role !== "guru" && role !== "admin") return jsonError(res, 403, "Teacher or Admin role is required");
    const requestId = typeof body.request_id === "string" ? body.request_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return jsonError(res, 400, "Invalid request id");

    let teacher = null;
    if (role === "guru") {
        teacher = await getTeacherForSession(session);
        if (!teacher) return jsonError(res, 403, "An active teacher account is required");
    }
    const query =
        "absence_requests?select=id,student_id,absence_type,status,medical_evidence_path,students!inner(homeroom_teacher_id)" +
        "&id=eq." + encodeURIComponent(requestId) + "&absence_type=eq.sick&limit=1";
    const rows = await supabaseRequest(query);
    if (!rows.length || !rows[0].medical_evidence_path ||
        (teacher && rows[0].students?.homeroom_teacher_id !== teacher.id)) {
        return jsonError(res, 404, "Medical evidence was not found for your assigned student");
    }
    const signedUrl = await createSignedStorageUrl(
        `/object/sign/medical-evidence/${encodeStoragePath(rows[0].medical_evidence_path)}`,
        { expiresIn: 300 }
    );
    return res.status(200).json({ url: signedUrl, expires_in: 300 });
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
        if (role === "admin") {
            try {
                const rows = await supabaseRequest(
                    "absence_requests?select=*,students!inner(nisn,name,class_name,homeroom_teacher_id)&order=created_at.desc&limit=500"
                );
                return res.status(200).json({ requests: rows.map(normalizeRow), notifications: [] });
            } catch (error) {
                console.error("Admin absence request list failed:", error);
                return jsonSupabaseError(res, error, "Unable to load absence requests");
            }
        }
        if (role === "guru") {
            try {
                const teacher = await getTeacherForSession(session);
                if (!teacher) return jsonError(res, 403, "An active teacher account is required");
                const rows = await supabaseRequest(
                    "absence_requests?select=*,students!inner(nisn,name,class_name,homeroom_teacher_id)" +
                    "&students.homeroom_teacher_id=eq." + encodeURIComponent(teacher.id) +
                    "&order=created_at.desc&limit=500"
                );
                const notices = await supabaseRequest(
                    "teacher_notifications?select=id,title,body,related_id,created_at&teacher_id=eq." +
                    encodeURIComponent(teacher.id) + "&read_at=is.null&order=created_at.desc&limit=20"
                );
                if (notices.length) {
                    await supabaseRequest(
                        "teacher_notifications?id=in.(" + notices.map(item => item.id).join(",") + ")",
                        {
                            method: "PATCH",
                            headers: { Prefer: "return=minimal" },
                            body: JSON.stringify({ read_at: new Date().toISOString() })
                        }
                    );
                }
                return res.status(200).json({ requests: rows.map(normalizeRow), notifications: notices });
            } catch (error) {
                console.error("Teacher absence request list failed:", error);
                return jsonSupabaseError(res, error, "Unable to load absence requests");
            }
        }
        if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "A student or teacher session is required");
        try {
            const student = await getStudentForSession(session);
            if (!student) return jsonError(res, 404, "Student account was not found");
            const rows = await supabaseRequest(
                "absence_requests?select=*,students!inner(nisn,name,class_name)&student_id=eq." +
                encodeURIComponent(student.id) + "&order=created_at.desc&limit=100"
            );
            return res.status(200).json({ requests: rows.map(normalizeRow), notifications: [] });
        } catch (error) {
            console.error("Student absence request list failed:", error);
            return jsonSupabaseError(res, error, "Unable to load your absence requests");
        }
    }

    if (req.method === "POST") {
        const body = req.body || {};
        if (body.action === "medical-evidence-view") {
            if (role !== "guru" && role !== "admin") return jsonError(res, 403, "Teacher or Admin role is required");
            if (!rateLimit(req, "absence:evidence-view", 10, 60_000, res)) {
                return jsonError(res, 429, "Too many evidence preview requests. Try again later.");
            }
            try {
                return await viewMedicalEvidence(req, res, role, session, body);
            } catch (error) {
                console.error("Medical evidence preview failed:", error);
                return jsonSupabaseError(res, error, "Unable to open medical evidence");
            }
        }
        if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "Only a signed-in student can submit an absence request");
        if (!rateLimit(req, "absence:POST:siswa", 8, 60_000, res)) {
            return jsonError(res, 429, "Too many absence requests. Try again later.");
        }
        try {
            if (body.action === "medical-evidence-sign") {
                return await signMedicalEvidenceUpload(req, res, session, body);
            }
            if (body.action) return jsonError(res, 400, "Unknown absence action");

            const { date, type } = body;
            const note = typeof body.note === "string" ? body.note.trim() : "";
            const severity = type === "sick" ? body.severity : null;
            if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                Number.isNaN(Date.parse(date + "T00:00:00Z"))) {
                return jsonError(res, 400, "Choose a valid absence date");
            }
            if (!TYPES.has(type)) return jsonError(res, 400, "Choose a valid absence type");
            if (!note || note.length > 1000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(note)) {
                return jsonError(res, 400, "The note must contain 1 to 1000 valid characters");
            }
            if (type === "sick" && !SICK_SEVERITIES.has(severity)) {
                return jsonError(res, 400, "A severity selection is required: choose mild, moderate, or severe.");
            }
            if (type !== "sick" && (body.medical_evidence_path || body.evidence_request_id)) {
                return jsonError(res, 400, "Medical evidence is only accepted for sick requests");
            }

            const student = await getStudentForSession(session);
            if (!student) return jsonError(res, 404, "Student account was not found");
            if (!student.homeroom_teacher_id) {
                return jsonError(res, 409, "Akun siswa belum ditautkan ke wali kelas. Hubungi Admin untuk memperbarui profil siswa.");
            }

            let medicalEvidence = null;
            if (type === "sick") {
                const requestId = typeof body.evidence_request_id === "string" ? body.evidence_request_id : "";
                if (!/^[0-9a-f-]{36}$/i.test(requestId) || typeof body.medical_evidence_path !== "string") {
                    return jsonError(res, 400, "Surat keterangan sakit wajib diunggah sebelum pengajuan dikirim");
                }
                medicalEvidence = await inspectMedicalEvidenceUpload(student.id, requestId, body.medical_evidence_path);
                if (medicalEvidence.error) return jsonError(res, 400, medicalEvidence.error);
            }

            if (type === "dispensation") {
                const today = jakartaDateTime().date;
                if (date !== today) return jsonError(res, 400, "Dispensation can only be requested for today");
                const attendance = await supabaseRequest(
                    "attendance?select=id&student_id=eq." + encodeURIComponent(student.id) +
                    "&date=eq." + encodeURIComponent(today) + "&limit=1"
                );
                if (!attendance.length) {
                    return jsonError(res, 403, "Record your school attendance before requesting a dispensation");
                }

                const { lat, lng, accuracy, gpsTimestamp } = body;
                if (![lat, lng, accuracy, gpsTimestamp].every(value => typeof value === "number" && Number.isFinite(value)) ||
                    lat < -90 || lat > 90 || lng < -180 || lng > 180 || accuracy <= 0 || accuracy > 35 ||
                    Math.abs(Date.now() - gpsTimestamp) > 30_000) {
                    return jsonError(res, 400, "A fresh, accurate GPS position is required for a school dispensation");
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
                    return jsonError(res, 503, "School location settings are invalid");
                }
                const distance = distanceMeters(school.lat, school.lng, lat, lng);
                if (distance + accuracy > school.radius) {
                    return jsonError(res, 403, "Dispensation can only be requested from clearly inside the school geofence");
                }
            }

            const existing = await supabaseRequest(
                "absence_requests?select=id,status&student_id=eq." + encodeURIComponent(student.id) +
                "&absence_date=eq." + encodeURIComponent(date) + "&status=eq.pending&limit=1"
            );
            if (existing.length) return jsonError(res, 409, "A pending request already exists for this date");

            const rows = await supabaseRequest(
                "absence_requests?select=id,student_id,absence_date,absence_type,severity,note,status,created_at,medical_evidence_path,medical_evidence_uploaded_at",
                {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        student_id: student.id,
                        absence_date: date,
                        absence_type: type,
                        severity,
                        note,
                        status: "pending",
                        ...(medicalEvidence ? {
                            medical_evidence_path: medicalEvidence.objectPath,
                            medical_evidence_uploaded_at: new Date().toISOString()
                        } : {})
                    })
                }
            );
            const row = rows[0];
            await writeAuditLog(session, "absence_request.create", "absence_requests", row?.id, {
                student_id: student.id,
                absence_date: date,
                absence_type: type,
                severity
            });

            let teacherNotification = { created: false };
            if (row?.id) {
                const notificationRows = await supabaseRequest(
                    "teacher_notifications?select=id&related_id=eq." + encodeURIComponent(row.id) + "&limit=1"
                );
                teacherNotification = { created: notificationRows.length > 0 };
            }

            let whatsapp = { sent: false, skipped: !student.parent_whatsapp };
            if (student.parent_whatsapp) {
                const target = student.parent_whatsapp.replace(/\D/g, "").replace(/^08/, "628");
                const typeLabel = ({
                    sick: "sakit",
                    permission: "izin",
                    other: "lainnya",
                    dispensation: "dispensasi"
                })[type];
                const message = "Amanah ID: pengajuan " + typeLabel + " " + student.name +
                    " tanggal " + date + " telah diterima dan menunggu peninjauan sekolah.";
                try {
                    const providerResult = await sendWhatsApp(target, message);
                    whatsapp = {
                        queued: true,
                        skipped: false,
                        request_id: providerResult?.requestid ?? null,
                        message_ids: Array.isArray(providerResult?.id) ? providerResult.id : [],
                        process: providerResult?.process || "pending"
                    };
                } catch (error) {
                    console.error("Absence WhatsApp notification failed:", error);
                    whatsapp = { sent: false, skipped: false, error: "WhatsApp notification failed" };
                }
            }
            return res.status(201).json({
                request: { ...row, nisn: student.nisn, name: student.name, class_name: student.class_name },
                teacher_notification: teacherNotification,
                whatsapp
            });
        } catch (error) {
            if (error?.code === "23505") return jsonError(res, 409, "A pending request already exists for this date");
            console.error("Absence request save failed:", error);
            return jsonSupabaseError(res, error, "Unable to save absence request");
        }
    }

    if (req.method === "PATCH") {
        if (role !== "guru" && role !== "admin") return jsonError(res, 403, "Teacher or Admin role is required");
        let teacher = null;
        try {
            if (role === "admin") {
                if (!await verifyAdminSession(req)) return jsonError(res, 403, "Administrator role is required");
            } else {
                teacher = await getTeacherForSession(session);
                if (!teacher) return jsonError(res, 403, "An active teacher account is required");
            }
        } catch (error) {
            console.error("Absence review authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate review permissions");
        }

        const body = req.body || {};
        const id = typeof body.id === "string" ? body.id : "";
        const status = body.status;
        if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.has(status)) {
            return jsonError(res, 400, "Invalid request id or review status");
        }
        const expectedCurrentStatus = status === "revoked" ? "approved" : "pending";
        try {
            if (teacher) {
                const scopedRows = await supabaseRequest(
                    "absence_requests?id=eq." + encodeURIComponent(id) +
                    "&status=eq." + expectedCurrentStatus + "&select=id,students!inner(homeroom_teacher_id)&limit=1"
                );
                if (!scopedRows.length || scopedRows[0]?.students?.homeroom_teacher_id !== teacher.id) {
                    return jsonError(res, 404, "Absence request was not found for your homeroom students");
                }
            }
            const rows = await supabaseRequest(
                "absence_requests?id=eq." + encodeURIComponent(id) +
                "&status=eq." + expectedCurrentStatus + "&select=id,student_id,absence_date,absence_type,severity,note,status,created_at,reviewed_at,reviewed_by",
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        status,
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: session?.email || "teacher"
                    })
                }
            );
            if (!rows.length) return jsonError(res, 409, "Request was already reviewed or no longer exists");
            await writeAuditLog(session, status === "revoked" ? "absence_request.revoke" : "absence_request.review", "absence_requests", id, { status, previous_status: expectedCurrentStatus });
            return res.status(200).json({ request: rows[0] });
        } catch (error) {
            console.error("Absence request review failed:", error);
            return jsonSupabaseError(res, error, "Unable to review absence request");
        }
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return jsonError(res, 405, "Method not allowed");
}
