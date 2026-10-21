export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const deploymentOrigin = process.env.APP_ORIGIN
        ? process.env.APP_ORIGIN.replace(/\/+$/, "")
        : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
    const requestOrigin = req.headers.origin;
    if (!deploymentOrigin || requestOrigin !== deploymentOrigin) {
        return res.status(403).json({ error: "Request origin is not allowed" });
    }

    const token = process.env.FONNTE_TOKEN;
    if (!token) {
        console.error("FONNTE_TOKEN environment variable is not configured");
        return res.status(500).json({ error: "WhatsApp service is not configured" });
    }

    const { target, message } = req.body || {};
    if (typeof target !== "string" || !/^628\d{8,13}$/.test(target)) {
        return res.status(400).json({ error: "Invalid recipient number" });
    }
    if (typeof message !== "string" || message.length < 10 || message.length > 500 ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message)) {
        return res.status(400).json({ error: "Invalid message" });
    }

    try {
        const upstream = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
                Authorization: token,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ target, message })
        });
        const result = await upstream.json();
        if (!upstream.ok || result.status === false || result.status === "false") {
            console.error("Fonnte request failed with status", upstream.status);
            return res.status(502).json({ error: "WhatsApp provider request failed" });
        }
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Fonnte request error:", error);
        return res.status(502).json({ error: "WhatsApp provider is unavailable" });
    }
}
