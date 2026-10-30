import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

function getSessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (typeof secret !== "string" || secret.length < 32) {
        throw new Error("SESSION_SECRET must contain at least 32 characters");
    }
    return secret;
}

export async function hashPassword(password) {
    const digest = createHash("sha256").update(password).digest("hex");
    return bcrypt.hash(digest, 12);
}

export async function verifyPassword(password, passwordHash) {
    if (typeof password !== "string" || typeof passwordHash !== "string") return false;
    try {
        return await bcrypt.compare(password, passwordHash);
    } catch {
        return false;
    }
}

export function isValidAdminPassword(password) {
    return typeof password === "string" && password.length >= 12 &&
        /[a-z]/.test(password) && /[A-Z]/.test(password) &&
        /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function signToken(claims, durationMs = SESSION_DURATION_MS) {
    if (!Number.isSafeInteger(durationMs) || durationMs < 1 || durationMs > SESSION_DURATION_MS) {
        throw new Error("Token duration is outside the allowed range");
    }
    const payload = Buffer.from(JSON.stringify({
        ...claims,
        exp: Date.now() + durationMs
    })).toString("base64url");
    const signature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

export function verifyToken(token) {
    if (typeof token !== "string") return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    try {
        const expected = createHmac("sha256", getSessionSecret()).update(payload).digest();
        const actual = Buffer.from(signature, "base64url");
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
        const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!claims || !Number.isFinite(claims.exp) || claims.exp <= Date.now() ||
            !["admin", "guru", "siswa"].includes(claims.role) ||
            typeof claims.email !== "string") return null;
        return claims;
    } catch {
        return null;
    }
}

export function validatePassword(password) {
    return typeof password === "string" && password.length >= 8 &&
        password.length <= 128 && !/[\u0000-\u001F\u007F]/.test(password);
}
