import { isAllowedOrigin, jsonError, rateLimit, verifyAdminSession } from "./supabase.js";

export async function authorizeAdmin(req, res, route) {
    if (!isAllowedOrigin(req)) {
        jsonError(res, 403, "Request origin is not allowed");
        return null;
    }
    if (!rateLimit(req, `admin:${route}`, 60, 60_000, res)) {
        jsonError(res, 429, "Rate limit exceeded. Try again shortly.");
        return null;
    }
    try {
        const session = await verifyAdminSession(req);
        if (!session) {
            jsonError(res, 401, "Admin session is missing, invalid, or expired");
            return null;
        }
        return session;
    } catch (error) {
        console.error("Admin authorization failed:", error);
        jsonError(res, 503, "Unable to validate admin session");
        return null;
    }
}
