export const DEFAULT_ATTENDANCE_WHATSAPP_TEMPLATE =
    "Assalamu'alaikum, Bapak/Ibu. Kami informasikan bahwa {name} telah tercatat hadir di Al-Fityan School pada {date} pukul {time}. Terima kasih.";

export function normalizeWhatsAppNumber(value) {
    if (typeof value !== "string") return null;
    let digits = value.trim().replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    else if (digits.startsWith("8")) digits = "62" + digits;
    return /^628\d{8,13}$/.test(digits) ? digits : null;
}

export function renderAttendanceWhatsAppMessage(template, student, date, time) {
    const values = {
        name: String(student?.name || "").trim(),
        nisn: String(student?.nisn || "").trim(),
        class: String(student?.class_name || "").trim(),
        date: String(date || "").trim(),
        time: String(time || "").trim(),
        school: "Al-Fityan School"
    };
    return String(template || DEFAULT_ATTENDANCE_WHATSAPP_TEMPLATE)
        .replace(/\{([a-z_]+)\}/gi, (match, key) =>
            Object.prototype.hasOwnProperty.call(values, key) ? values[key] : "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

export async function sendWhatsApp(target, message) {
    if (typeof target !== "string" || !/^628\d{8,13}$/.test(target)) {
        throw new Error("Invalid WhatsApp recipient");
    }
    if (typeof message !== "string" || message.length < 10 || message.length > 500 ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) {
        throw new Error("Invalid WhatsApp message");
    }
    const token = process.env.FONNTE_TOKEN;
    if (!token) throw new Error("FONNTE_TOKEN is not configured");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7_000);
    let response;
    let payload;
    try {
        const form = new FormData();
        form.set("target", target);
        form.set("message", message);
        form.set("connectOnly", "false");
        response = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            cache: "no-store",
            headers: {
                Authorization: token,
                Accept: "application/json"
            },
            body: form,
            signal: controller.signal
        });
        const responseText = await response.text();
        try { payload = responseText ? JSON.parse(responseText) : null; }
        catch {
            const error = new Error("WhatsApp provider returned an unreadable response; delivery could not be confirmed");
            error.status = response.status;
            error.code = "FONNTE_UNCERTAIN_RESPONSE";
            throw error;
        }
    } catch (cause) {
        if (cause?.name === "AbortError") {
            const error = new Error("WhatsApp provider timed out; delivery could not be confirmed");
            error.status = 504;
            error.code = "FONNTE_TIMEOUT";
            throw error;
        }
        if (cause?.code === "FONNTE_UNCERTAIN_RESPONSE") throw cause;
        const error = new Error("WhatsApp provider is temporarily unreachable");
        error.code = "FONNTE_NETWORK_ERROR";
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }

    if (response.status >= 500 || !payload || typeof payload !== "object" ||
        response.ok && payload.status !== true && payload.status !== "true" && payload.status !== false && payload.status !== "false") {
        const error = new Error("WhatsApp provider response was inconclusive; delivery could not be confirmed");
        error.status = response.status;
        error.code = "FONNTE_UNCERTAIN_RESPONSE";
        throw error;
    }
    if (!response.ok || payload.status === false || payload.status === "false") {
        const error = new Error("WhatsApp provider rejected the request or did not accept the message");
        error.status = response.status;
        error.code = "FONNTE_REJECTED";
        throw error;
    }
    if (payload.status !== true && payload.status !== "true") {
        const error = new Error("WhatsApp provider did not confirm the message request");
        error.status = response.status;
        error.code = "FONNTE_UNCERTAIN_RESPONSE";
        throw error;
    }
    return payload;
}
