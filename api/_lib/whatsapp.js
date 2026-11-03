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
        catch { throw new Error("WhatsApp provider returned an invalid response"); }
    } catch (cause) {
        if (cause?.name === "AbortError") {
            const error = new Error("WhatsApp provider timed out; delivery could not be confirmed");
            error.status = 504;
            error.code = "FONNTE_TIMEOUT";
            throw error;
        }
        if (cause?.message === "WhatsApp provider returned an invalid response") throw cause;
        const error = new Error("WhatsApp provider is temporarily unreachable");
        error.code = "FONNTE_NETWORK_ERROR";
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok || payload?.status === false || payload?.status === "false" || payload?.status !== true && payload?.status !== "true") {
        const error = new Error("WhatsApp provider rejected the request or did not accept the message");
        error.status = response.status;
        error.code = "FONNTE_REJECTED";
        throw error;
    }
    return payload;
}
