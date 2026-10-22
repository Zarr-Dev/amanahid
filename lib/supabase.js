export function isAllowedOrigin(req) {
    const allowedOrigin = process.env.APP_ORIGIN?.replace(/\/+$/, "");
    if (!allowedOrigin) return false;

    const requestOrigin = req.headers.origin;
    if (requestOrigin) return requestOrigin === allowedOrigin;

    const referer = req.headers.referer;
    if (!referer) return false;
    try {
        return new URL(referer).origin === allowedOrigin;
    } catch {
        return false;
    }
}

export function hasRole(req, role) {
    return req.headers["x-role"] === role;
}

const rateLimitBuckets = new Map();

export function rateLimit(req, key, maxRequests, windowMs) {
    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIps = typeof forwardedFor === "string" ? forwardedFor.split(",") : [];
    const ip = forwardedIps.length
        ? forwardedIps[forwardedIps.length - 1].trim()
        : req.socket?.remoteAddress || "unknown";
    const bucketKey = `${key}:${ip}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(bucketKey);

    if (!bucket || now - bucket.startedAt >= windowMs) {
        rateLimitBuckets.set(bucketKey, { startedAt: now, count: 1 });
        if (rateLimitBuckets.size > 1000) {
            for (const [entryKey, entry] of rateLimitBuckets) {
                if (now - entry.startedAt >= windowMs) rateLimitBuckets.delete(entryKey);
            }
        }
        return true;
    }
    if (bucket.count >= maxRequests) return false;
    bucket.count++;
    return true;
}

export function verifyTeacherSession(req) {
    // TODO: ganti dengan Supabase Auth JWT.
    return hasRole(req, "guru");
}

export async function supabaseRequest(path, options = {}) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !secretKey) throw new Error("Supabase environment variables are not configured");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    let response;
    let responseText;
    try {
        response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/${path}`, {
            ...options,
            signal: controller.signal,
            headers: {
                apikey: secretKey,
                "Content-Type": "application/json",
                ...options.headers
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
    return payload;
}

export function jsonSupabaseError(res, error, fallback) {
    if (error?.code === "SUPABASE_TIMEOUT" || error?.status === 504) {
        return jsonError(res, 504, "Supabase request timed out. Please retry.");
    }
    if (error?.status === 429) {
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

export function getRequestRole(req) {
    const role = req.headers["x-role"];
    return role === "guru" || role === "siswa" ? role : null;
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
