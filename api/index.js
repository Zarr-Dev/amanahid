export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "HEAD") return res.status(200).end();
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET, HEAD");
        return res.status(405).json({ error: "Method not allowed", method: req.method });
    }
    return res.status(200).json({
        ok: true,
        service: "Amanah.id API",
        runtime: process.version
    });
}
