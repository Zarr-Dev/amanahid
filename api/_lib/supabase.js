import { verifyToken } from "./admin-auth.js";

export function getMissingAuthConfiguration() {
    const missing = [];
    if (!process.env.APP_ORIGIN) missing.push("APP_ORIGIN");
    if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!process.env.SUPABASE_SECRET_KEY) missing.push("SUPABASE_SECRET_KEY");
    if (typeof process.env.SESSION_SECRET !== "string" || process.env.SESSION_SECRET.length < 32) {
        missing.push("SESSION_SECRET (minimum 32 characters)");
    }
    return missing;
}

export function isAllowedOrigin(req) {
    const allowedOrigins = new Set([
        process.env.APP_ORIGIN?.replace(/\/+$/, ""),
        "https://amanahid.netlify.app"
    ].filter(Boolean));

    const requestOrigin = req.headers.origin;
    if (requestOrigin) return allowedOrigins.has(requestOrigin.replace(/\/+$/, ""));

    const referer = req.headers.referer;
    if (!referer) return false;
    try {
        return allowedOrigins.has(new URL(referer).origin);
    } catch {
        return false;
    }
}
const rateLimitBuckets = new Map();

export function rateLimit(req, key, maxRequests, windowMs, res) {
    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIps = typeof forwardedFor === "string" ? forwardedFor.split(",") : [];
    const ip = forwardedIps.length
        ? forwardedIps[forwardedIps.length - 1].trim()
        : req.socket?.remoteAddress || "unknown";
    const bucketKey = `${ip}:${key}`;
    const now = Date.now();
    const timestamps = (rateLimitBuckets.get(bucketKey) || [])
        .filter(timestamp => timestamp > now - windowMs);
    if (timestamps.length >= maxRequests) {
        const retryAfter = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000));
        res?.setHeader("Retry-After", String(retryAfter));
        rateLimitBuckets.set(bucketKey, timestamps);
        return false;
    }
    timestamps.push(now);
    rateLimitBuckets.set(bucketKey, timestamps);
    if (rateLimitBuckets.size > 1000) {
        for (const [entryKey, entry] of rateLimitBuckets) {
            if (!entry.length || entry[entry.length - 1] <= now - windowMs) rateLimitBuckets.delete(entryKey);
        }
    }
    return true;
}

export function getSession(req) {
    return verifyToken(
        req.headers["x-session-token"] || req.headers["x-admin-token"]
    );
}

export function verifyUserSession(req) {
    return getSession(req);
}

export async function verifyTeacherSession(req) {
    return (await getRequestRole(req)) === "guru";
}

export async function verifyAdminSession(req) {
    const session = getSession(req);
    if (session?.role !== "admin" ||
        typeof req.headers["x-admin-token"] !== "string") return null;
    try {
        const adminRows = await supabaseRequest(
            `admin_users?select=email,name,is_active&email=eq.${encodeURIComponent(session.email)}&limit=1`
        );
        const admin = Array.isArray(adminRows) ? (adminRows[0] ?? null) : null;
        return admin?.is_active ? { ...session, name: admin.name ?? session.name ?? session.email } : null;
    } catch (error) {
        console.error("Admin session validation failed:", error);
        throw error;
    }
}

export async function supabaseRequest(path, options = {}) {
    const { returnMetadata = false, ...requestOptions } = options;
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !secretKey) throw new Error("Supabase environment variables are not configured");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    let response;
    let responseText;
    try {
        response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/${path}`, {
            ...requestOptions,
            signal: controller.signal,
            headers: {
                apikey: secretKey,
                "Content-Type": "application/json",
                ...requestOptions.headers
            }
        });
        responseText = await response.text();
    } catch (cause) {
        if (cause?.name === "AbortError") {
            const error = new Error("Supabase request timed out after 8 seconds");
            error.status = 504;
            error.code = "SUPABASE_TIMEOUT";
            throw error;
        }
        throw cause;
    } finally {
        clearTimeout(timeoutId);
    }
    let payload = null;
    if (responseText) {
        try {
            payload = JSON.parse(responseText);
        } catch {
            throw new Error("Supabase returned an invalid response");
        }
    }

    if (!response.ok) {
        const error = new Error(payload?.message || "Supabase request failed");
        error.status = response.status;
        error.code = payload?.code;
        throw error;
    }
    return returnMetadata ? { data: payload, headers: response.headers } : payload;
}

export async function supabaseCount(path) {
    const result = await supabaseRequest(path, {
        headers: { Prefer: "count=exact", Range: "0-0" },
        returnMetadata: true
    });
    const total = result?.headers?.get("content-range")?.split("/")[1];
    if (!total || total === "*") throw new Error("Supabase did not return an exact row count");
    const count = Number(total);
    if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error("Supabase returned an invalid row count");
    }
    return count;
}

export function jsonSupabaseError(res, error, fallback) {
    if (error?.code === "SUPABASE_TIMEOUT" || error?.status === 504) {
        return jsonError(res, 504, "Supabase request timed out. Please retry.");
    }
    if (error?.status === 429) {
        res.setHeader("Retry-After", "60");
        return jsonError(res, 429, "Supabase is rate limiting requests. Please retry shortly.");
    }
    if (error?.status >= 500 || error instanceof TypeError) {
        return jsonError(res, 503, "Supabase is temporarily unavailable. Please retry.");
    }
    return jsonError(res, 500, fallback);
}

export function jsonError(res, status, error) {
    return res.status(status).json({ error });
}

export async function getRequestRole(req) {
    const session = getSession(req);
    if (!session) return null;
    if (session.role === "admin") {
        return await verifyAdminSession(req) ? "admin" : null;
    }
    if (session.role !== "guru" && session.role !== "siswa") return null;
    const table = session.role === "guru" ? "teachers" : "students";
    const columns = session.role === "guru" ? "email,is_active" : "email,nisn,is_active";
    const users = await supabaseRequest(
        `${table}?select=${columns}&email=eq.${encodeURIComponent(session.email)}&limit=1`
    );
    const user = Array.isArray(users) ? (users[0] ?? null) : null;
    if (!user?.is_active || (session.role === "siswa" && user.nisn !== session.nisn)) return null;
    return session.role;
}

export function jakartaDateTime(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(now).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}:${parts.second}`
    };
}
