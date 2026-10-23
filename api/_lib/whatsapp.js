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
    let result;
    try {
        response = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
                Authorization: token,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ target, message }),
            signal: controller.signal
        });
        result = await response.json();
    } catch (cause) {
        if (cause?.name === "AbortError") {
            const error = new Error("WhatsApp provider timed out");
            error.status = 504;
            throw error;
        }
        throw new Error("WhatsApp provider returned an invalid response", { cause });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok || result.status === false || result.status === "false") {
        throw new Error(`WhatsApp provider returned status ${response.status}`);
    }
    return result;
}
