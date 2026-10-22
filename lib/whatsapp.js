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

    const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
            Authorization: token,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ target, message })
    });
    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("WhatsApp provider returned an invalid response");
    }

    if (!response.ok || result.status === false || result.status === "false") {
        throw new Error(`WhatsApp provider returned status ${response.status}`);
    }
    return result;
}
