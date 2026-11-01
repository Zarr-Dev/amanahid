import { randomUUID } from "node:crypto";
import {
    getRequestRole, getSession, isAllowedOrigin, jsonError, jsonSupabaseError,
    rateLimit, supabaseRequest, verifyTeacherSession
} from "./_lib/supabase.js";
import { sendWhatsApp } from "./_lib/whatsapp.js";
import { writeAuditLog } from "./_lib/audit.js";

const TYPES = new Set(["sick", "permission", "other", "dispensation"]);
const REVIEW = new Set(["approved", "rejected"]);
const DISPENSATION_KINDS = new Set(["temporary_exit", "late_arrival", "early_departure", "class_permission", "other"]);
const BUCKET = "medical-evidence";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS = Object.freeze({
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png"
});

function normalize(row) {
    const student = row.students || {};
    return {
        id: row.id, student_id: row.student_id,
        nisn: student.nisn || "", name: student.name || "", class_name: student.class_name || "",
        absence_date: row.absence_date, absence_type: row.absence_type,
        dispensation_kind: row.dispensation_kind || null,
        start_time: row.start_time ? String(row.start_time).slice(0, 5) : null,
        end_time: row.end_time ? String(row.end_time).slice(0, 5) : null,
        note: row.note, status: row.status,
        estimated_rest_days: row.estimated_rest_days ?? null,
        medical_file_uploaded: Boolean(row.medical_file_path && row.medical_uploaded_at),
        created_at: row.created_at, reviewed_at: row.reviewed_at
    };
}

function storageConfig() {
    const url = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url.startsWith("https://") || !key) throw new Error("Private evidence storage is not configured");
    return { base: url + "/storage/v1", key };
}

function encodePath(path) {
    return String(path).split("/").map(encodeURIComponent).join("/");
}

function minutes(value) {
    const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(String(value || "").slice(0, 5));
    return match ? Number(match[0].slice(0, 2)) * 60 + Number(match[0].slice(3, 5)) : NaN;
}

function localSchoolClock(timeZone, date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: values.year + "-" + values.month + "-" + values.day, time: values.hour + ":" + values.minute };
}

export function validDispensationWindow(date, start, end, settings, now = new Date()) {
    try {
        const clock = localSchoolClock(settings.timezone || "Asia/Jakarta", now);
        const current = minutes(clock.time);
        const opening = minutes(settings.dispensation_open_time);
        const closing = minutes(settings.dispensation_close_time);
        const begin = minutes(start);
        const finish = minutes(end);
        return date === clock.date && Number.isFinite(current) &&
            Number.isFinite(opening) && Number.isFinite(closing) &&
            current >= opening && current <= closing &&
            Number.isFinite(begin) && Number.isFinite(finish) &&
            begin >= opening && finish <= closing &&
            begin >= current - 15 && finish > begin && finish - begin <= 240;
    } catch {
        return false;
    }
}

export function validMedicalMagicBytes(value, mime) {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value || []);
    if (mime === "application/pdf") return bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mime === "image/png") return bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return false;
}

async function storageRequest(path, method, body) {
    const { base, key } = storageConfig();
    const response = await fetch(base + path, {
        method,
        headers: {
            apikey: key, Authorization: "Bearer " + key,
            "Content-Type": "application/json"
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
    if (!response.ok) {
        const error = new Error("Private medical storage request failed");
        error.status = response.status;
        throw error;
    }
    return data;
}

function storageUrl(value) {
    const { base } = storageConfig();
    if (typeof value !== "string" || !value) throw new Error("Storage did not return a signed URL");
    return /^https:\/\//i.test(value) ? value : base + (value.startsWith("/") ? value : "/" + value);
}

async function ownStudent(session) {
    const rows = await supabaseRequest(
        "students?select=id,nisn,name,class_name,parent_whatsapp&nisn=eq." +
        encodeURIComponent(session.nisn) + "&is_active=eq.true&limit=1"
    );
    return rows[0] || null;
}

async function teacherHomeroom(session) {
    if (!session?.email) return null;
    const rows = await supabaseRequest(
        "teachers?select=id,name,homeroom_class&email=eq." +
        encodeURIComponent(session.email) + "&is_active=eq.true&limit=1"
    );
    return rows[0]?.homeroom_class?.trim() || null;
}

async function createMedicalUpload(req, res, session) {
    if (!rateLimit(req, "absence:evidence-upload:siswa", 4, 60_000, res)) {
        return jsonError(res, 429, "Terlalu banyak permintaan unggahan. Coba lagi nanti.");
    }
    const body = req.body || {};
    const id = typeof body.id === "string" ? body.id : "";
    const mime = body.content_type;
    const size = Number(body.size);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !Object.hasOwn(MIME_EXTENSIONS, mime) ||
        !Number.isInteger(size) || size < 1 || size > MAX_FILE_BYTES) {
        return jsonError(res, 400, "Permohonan, format, atau ukuran berkas tidak valid");
    }
    try {
        const student = await ownStudent(session);
        if (!student) return jsonError(res, 404, "Data siswa tidak ditemukan");
        const rows = await supabaseRequest(
            "absence_requests?select=id,student_id,absence_type,status&id=eq." +
            encodeURIComponent(id) + "&student_id=eq." + encodeURIComponent(student.id) + "&limit=1"
        );
        const request = rows[0];
        if (!request || request.absence_type !== "sick" || request.status !== "awaiting_medical") {
            return jsonError(res, 409, "Bukti medis hanya dapat diunggah setelah Guru menyetujui pengajuan sakit secara bersyarat");
        }
        const path = student.id + "/" + request.id + "/" + randomUUID() + "." + MIME_EXTENSIONS[mime];
        const signed = await storageRequest(
            "/object/upload/sign/" + BUCKET + "/" + encodePath(path), "POST", {}
        );
        const token = signed.token || "";
        const rawSignedUrl = signed.signedURL || signed.signedUrl || signed.url;
        let uploadUrl = storageUrl(rawSignedUrl);
        if (token) {
            const url = new URL(uploadUrl);
            if (!url.searchParams.has("token")) url.searchParams.set("token", token);
            uploadUrl = url.toString();
        }
        return res.status(200).json({ path, uploadUrl });
    } catch (error) {
        console.error("Medical evidence upload URL failed:", error);
        return jsonSupabaseError(res, error, "Tidak dapat menyiapkan unggahan bukti medis");
    }
}

async function submitMedicalEvidence(req, res, session) {
    if (!rateLimit(req, "absence:evidence-submit:siswa", 4, 60_000, res)) {
        return jsonError(res, 429, "Terlalu banyak pengiriman bukti. Coba lagi nanti.");
    }
    const body = req.body || {};
    const id = typeof body.id === "string" ? body.id : "";
    const path = typeof body.path === "string" ? body.path : "";
    const mime = body.content_type;
    const days = Number(body.estimated_rest_days);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !Object.hasOwn(MIME_EXTENSIONS, mime) ||
        !Number.isInteger(days) || days < 1 || days > 30) {
        return jsonError(res, 400, "ID, format bukti, atau estimasi istirahat 1–30 hari tidak valid");
    }
    try {
        const student = await ownStudent(session);
        if (!student) return jsonError(res, 404, "Data siswa tidak ditemukan");
        const rows = await supabaseRequest(
            "absence_requests?select=id,student_id,absence_type,status&id=eq." +
            encodeURIComponent(id) + "&student_id=eq." + encodeURIComponent(student.id) + "&limit=1"
        );
        const request = rows[0];
        if (!request || request.absence_type !== "sick" || request.status !== "awaiting_medical") {
            return jsonError(res, 409, "Pengajuan ini tidak sedang menunggu bukti medis");
        }
        const prefix = student.id + "/" + id + "/";
        const filename = path.startsWith(prefix) ? path.slice(prefix.length) : "";
        if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(filename) ||
            !filename.toLowerCase().endsWith("." + MIME_EXTENSIONS[mime])) {
            return jsonError(res, 400, "Lokasi berkas tidak cocok dengan pengajuan ini");
        }

        const { base, key } = storageConfig();
        const uploaded = await fetch(base + "/object/" + BUCKET + "/" + encodePath(path), {
            headers: { apikey: key, Authorization: "Bearer " + key }
        });
        if (!uploaded.ok) return jsonError(res, 400, "Berkas belum berhasil diunggah");
        const bytes = Buffer.from(await uploaded.arrayBuffer());
        if (!bytes.length || bytes.length > MAX_FILE_BYTES || !validMedicalMagicBytes(bytes, mime)) {
            try {
                await fetch(base + "/object/" + BUCKET + "/" + encodePath(path), {
                    method: "DELETE", headers: { apikey: key, Authorization: "Bearer " + key }
                });
            } catch (cleanupError) {
                console.error("Invalid medical upload cleanup failed:", cleanupError);
            }
            return jsonError(res, 400, "Isi berkas tidak cocok dengan PDF, JPG, atau PNG yang diizinkan");
        }

        const updated = await supabaseRequest(
            "absence_requests?id=eq." + encodeURIComponent(id) +
            "&student_id=eq." + encodeURIComponent(student.id) +
            "&status=eq.awaiting_medical&select=id,status",
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({
                    status: "evidence_submitted",
                    estimated_rest_days: days,
                    medical_file_path: path,
                    medical_file_mime: mime,
                    medical_uploaded_at: new Date().toISOString()
                })
            }
        );
        if (!updated.length) return jsonError(res, 409, "Status pengajuan berubah. Muat ulang halaman dan coba lagi.");
        await writeAuditLog(session, "absence_request.medical_evidence_submit", "absence_requests", id, {
            estimated_rest_days: days, content_type: mime, file_size_bytes: bytes.length
        });
        return res.status(200).json({ ok: true, status: "evidence_submitted" });
    } catch (error) {
        console.error("Medical evidence submission failed:", error);
        return jsonSupabaseError(res, error, "Bukti medis gagal diverifikasi");
    }
}

async function signedMedicalDownload(req, res, role, session) {
    const id = typeof req.query?.id === "string" ? req.query.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(res, 400, "ID pengajuan tidak valid");
    try {
        const rows = await supabaseRequest(
            "absence_requests?select=id,student_id,absence_type,medical_file_path,students!inner(class_name)&id=eq." +
            encodeURIComponent(id) + "&limit=1"
        );
        const request = rows[0];
        if (!request || request.absence_type !== "sick" || !request.medical_file_path) {
            return jsonError(res, 404, "Bukti medis tidak ditemukan");
        }
        if (role === "siswa") {
            const student = session?.nisn ? await ownStudent(session) : null;
            if (!student || student.id !== request.student_id) {
                return jsonError(res, 403, "Anda tidak berwenang membuka bukti ini");
            }
        } else if (role === "guru") {
            const homeroom = await teacherHomeroom(session);
            const studentClass = String(request.students?.class_name || "").trim().toLowerCase();
            if (!homeroom || homeroom.toLowerCase() !== studentClass) {
                return jsonError(res, 403, "Bukti medis hanya dapat dibuka oleh wali kelas yang ditugaskan");
            }
        } else {
            return jsonError(res, 403, "Hanya pemilik pengajuan atau wali kelas terkait yang dapat membuka bukti ini");
        }
        const signed = await storageRequest(
            "/object/sign/" + BUCKET + "/" + encodePath(request.medical_file_path),
            "POST", { expiresIn: 60, download: true }
        );
        return res.status(200).json({
            signedUrl: storageUrl(signed.signedURL || signed.signedUrl || signed.url)
        });
    } catch (error) {
        console.error("Medical evidence download failed:", error);
        return jsonSupabaseError(res, error, "Bukti medis tidak dapat dibuka");
    }
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (!isAllowedOrigin(req)) return jsonError(res, 403, "Request origin is not allowed");
    let role;
    try { role = await getRequestRole(req); }
    catch (error) {
        console.error("Absence request authorization failed:", error);
        return jsonSupabaseError(res, error, "Unable to validate session");
    }
    const session = getSession(req);

    if (req.method === "GET" && req.query?.action === "evidence-download") {
        return signedMedicalDownload(req, res, role, session);
    }
    if (req.method === "POST" && req.query?.action === "evidence-upload") {
        if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "Only the request owner can upload evidence");
        return createMedicalUpload(req, res, session);
    }
    if (req.method === "POST" && req.query?.action === "evidence-submit") {
        if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "Only the request owner can submit evidence");
        return submitMedicalEvidence(req, res, session);
    }

    if (req.method === "GET") {
        try {
            if (role === "guru") {
                const homeroom = await teacherHomeroom(session);
                if (!homeroom) return res.status(200).json({ requests: [], requires_homeroom_assignment: true });
                const rows = await supabaseRequest(
                    "absence_requests?select=*,students!inner(nisn,name,class_name)&students.class_name=eq." +
                    encodeURIComponent(homeroom) + "&order=created_at.desc&limit=500"
                );
                return res.status(200).json({ requests: rows.map(normalize), homeroom_class: homeroom });
            }
            if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "A student or teacher session is required");
            const student = await ownStudent(session);
            if (!student) return jsonError(res, 404, "Student account was not found");
            const rows = await supabaseRequest(
                "absence_requests?select=*,students!inner(nisn,name,class_name)&student_id=eq." +
                encodeURIComponent(student.id) + "&order=created_at.desc&limit=100"
            );
            return res.status(200).json({ requests: rows.map(normalize) });
        } catch (error) {
            console.error("Absence request list failed:", error);
            return jsonSupabaseError(res, error, "Unable to load absence requests");
        }
    }

    if (req.method === "POST") {
        if (role !== "siswa" || !session?.nisn) return jsonError(res, 403, "Only a signed-in student can submit an absence request");
        if (!rateLimit(req, "absence:POST:siswa", 5, 60_000, res)) {
            return jsonError(res, 429, "Too many absence requests. Try again later.");
        }
        const body = req.body || {};
        const date = body.date;
        const type = body.type;
        const note = typeof body.note === "string" ? body.note.trim() : "";
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(Date.parse(date + "T00:00:00Z")) ||
            new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date) {
            return jsonError(res, 400, "Pilih tanggal pengajuan yang valid");
        }
        if (!TYPES.has(type)) return jsonError(res, 400, "Pilih jenis pengajuan yang valid");
        if (!note || note.length > 1000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(note)) {
            return jsonError(res, 400, "Keterangan harus berisi 1–1000 karakter yang valid");
        }

        const kind = body.dispensation_kind;
        const start = typeof body.start_time === "string" ? body.start_time : "";
        const end = typeof body.end_time === "string" ? body.end_time : "";
        if (type === "dispensation" && !DISPENSATION_KINDS.has(kind)) {
            return jsonError(res, 400, "Pilih jenis dispensasi yang valid");
        }
        if (type !== "dispensation" && (kind || start || end)) {
            return jsonError(res, 400, "Rincian jam hanya berlaku untuk jenis dispensasi");
        }

        try {
            const student = await ownStudent(session);
            if (!student) return jsonError(res, 404, "Student account was not found");
            if (type === "dispensation") {
                const settings = await supabaseRequest(
                    "school_settings?select=timezone,dispensation_open_time,dispensation_close_time&id=eq.00000000-0000-0000-0000-000000000001&limit=1"
                );
                if (!settings[0] || !validDispensationWindow(date, start, end, settings[0])) {
                    return jsonError(res, 403, "Dispensasi hanya dapat diajukan hari ini selama jam layanan sekolah (maksimal empat jam)");
                }
            }

            const active = await supabaseRequest(
                "absence_requests?select=id,status&student_id=eq." + encodeURIComponent(student.id) +
                "&absence_date=eq." + encodeURIComponent(date) +
                "&status=in.(pending,awaiting_medical,evidence_submitted)&limit=1"
            );
            if (active.length) return jsonError(res, 409, "Sudah ada pengajuan aktif pada tanggal tersebut");

            const rows = await supabaseRequest(
                "absence_requests?select=id,student_id,absence_date,absence_type,note,status,dispensation_kind,start_time,end_time,created_at",
                {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        student_id: student.id, absence_date: date, absence_type: type,
                        note, status: "pending",
                        ...(type === "dispensation" ? { dispensation_kind: kind, start_time: start, end_time: end } : {})
                    })
                }
            );
            const created = rows[0];
            await writeAuditLog(session, "absence_request.create", "absence_requests", created?.id, {
                student_id: student.id, absence_date: date, absence_type: type,
                ...(type === "dispensation" ? { dispensation_kind: kind, start_time: start, end_time: end } : {})
            });

            let whatsapp = { sent: false, skipped: !student.parent_whatsapp };
            if (student.parent_whatsapp) {
                const target = student.parent_whatsapp.replace(/\D/g, "").replace(/^08/, "628");
                const typeLabel = ({ sick: "sakit", permission: "izin", other: "lainnya", dispensation: "dispensasi" })[type];
                try {
                    await sendWhatsApp(target, "Amanah ID: pengajuan " + typeLabel + " " + student.name +
                        " tanggal " + date + " telah diterima dan menunggu peninjauan sekolah.");
                    whatsapp = { sent: true, skipped: false };
                } catch (error) {
                    console.error("Absence WhatsApp notification failed:", error);
                    whatsapp = { sent: false, skipped: false, error: "WhatsApp notification failed" };
                }
            }
            return res.status(201).json({ request: created, whatsapp });
        } catch (error) {
            if (error?.code === "23505") return jsonError(res, 409, "Sudah ada pengajuan aktif pada tanggal tersebut");
            console.error("Absence request save failed:", error);
            return jsonSupabaseError(res, error, "Unable to save absence request");
        }
    }

    if (req.method === "PATCH") {
        let teacherClass;
        try {
            if (!await verifyTeacherSession(req)) return jsonError(res, 403, "Teacher role is required");
            teacherClass = await teacherHomeroom(session);
        } catch (error) {
            console.error("Absence review authorization failed:", error);
            return jsonSupabaseError(res, error, "Unable to validate teacher session");
        }
        if (!teacherClass) return jsonError(res, 403, "Admin must assign a homeroom class before reviewing absence requests");
        const body = req.body || {};
        const id = typeof body.id === "string" ? body.id : "";
        const requestedStatus = body.status;
        if (!/^[0-9a-f-]{36}$/i.test(id) || !REVIEW.has(requestedStatus)) {
            return jsonError(res, 400, "ID atau status pengajuan tidak valid");
        }
        try {
            const found = await supabaseRequest(
                "absence_requests?select=id,student_id,absence_type,status,medical_file_path,students!inner(class_name)&id=eq." +
                encodeURIComponent(id) + "&limit=1"
            );
            const current = found[0];
            if (!current) return jsonError(res, 404, "Pengajuan tidak ditemukan");
            if (String(current.students?.class_name || "").trim().toLowerCase() !== teacherClass.toLowerCase()) {
                return jsonError(res, 403, "Guru hanya dapat meninjau pengajuan dari kelas wali yang ditugaskan");
            }
            if (!["pending", "awaiting_medical", "evidence_submitted"].includes(current.status)) {
                return jsonError(res, 409, "Pengajuan sudah ditinjau atau tidak ditemukan");
            }

            let nextStatus = requestedStatus;
            if (requestedStatus === "approved" && current.absence_type === "sick") {
                if (current.status === "pending") nextStatus = "awaiting_medical";
                else if (current.status === "awaiting_medical") {
                    return jsonError(res, 409, "Siswa wajib mengunggah bukti medis sebelum persetujuan akhir");
                } else if (current.status !== "evidence_submitted") {
                    return jsonError(res, 409, "Bukti medis belum siap ditinjau");
                }
            }
            if (requestedStatus === "approved" && current.absence_type !== "sick" && current.status !== "pending") {
                return jsonError(res, 409, "Pengajuan tidak lagi dapat disetujui");
            }

            const changes = {
                status: nextStatus, reviewed_at: new Date().toISOString(),
                reviewed_by: session?.email || "teacher"
            };
            const rejectedPath = nextStatus === "rejected" ? current.medical_file_path : null;
            if (rejectedPath) {
                changes.medical_file_path = null;
                changes.medical_file_mime = null;
                changes.medical_uploaded_at = null;
                changes.estimated_rest_days = null;
            }
            const updated = await supabaseRequest(
                "absence_requests?id=eq." + encodeURIComponent(id) +
                "&status=eq." + encodeURIComponent(current.status) +
                "&select=id,student_id,absence_date,absence_type,status,reviewed_at",
                {
                    method: "PATCH", headers: { Prefer: "return=representation" },
                    body: JSON.stringify(changes)
                }
            );
            if (!updated.length) return jsonError(res, 409, "Status berubah. Muat ulang daftar pengajuan.");
            if (rejectedPath) {
                try {
                    const { base, key } = storageConfig();
                    await fetch(base + "/object/" + BUCKET + "/" + encodePath(rejectedPath), {
                        method: "DELETE", headers: { apikey: key, Authorization: "Bearer " + key }
                    });
                } catch (error) {
                    console.error("Rejected medical evidence cleanup failed:", error);
                }
            }
            await writeAuditLog(session, "absence_request.review", "absence_requests", id, {
                requested_status: requestedStatus, resulting_status: nextStatus
            });
            return res.status(200).json({
                request: updated[0],
                next_action: nextStatus === "awaiting_medical" ? "student_must_upload_medical_evidence" : null
            });
        } catch (error) {
            console.error("Absence review failed:", error);
            return jsonSupabaseError(res, error, "Unable to review absence request");
        }
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return jsonError(res, 405, "Method not allowed");
}
