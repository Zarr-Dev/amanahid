import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../api/_lib/admin-auth.js";
import { getRequestRole, rateLimit } from "../api/_lib/supabase.js";
import { validateSchema } from "../api/_lib/validate.js";
import adminUsersHandler from "../api/admin/users.js";
import adminLoginHandler from "../api/admin/login.js";
import attendanceHandler from "../api/attendance.js";
import faceMatchHandler from "../api/face-match.js";
import sendWhatsAppHandler from "../api/send-wa.js";
import settingsHandler from "../api/settings.js";
import studentsHandler from "../api/students.js";
import teachersHandler from "../api/teachers.js";

process.env.SESSION_SECRET = "test-session-secret-with-more-than-32-characters";
process.env.APP_ORIGIN = "https://school.example";
process.env.SUPABASE_URL = "https://supabase.example";
process.env.SUPABASE_SECRET_KEY = "test-service-secret";

function responseMock() {
    return {
        statusCode: null,
        headers: {},
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader(name, value) {
            this.headers[name] = value;
        },
        json(value) {
            this.body = value;
            return this;
        },
        end() {
            return this;
        }
    };
}

function requestMock(method, token, ip) {
    return {
        method,
        headers: {
            origin: "https://school.example",
            ...(token ? { "x-session-token": token } : {})
        },
        socket: { remoteAddress: ip }
    };
}

test("passwords are SHA-256 prehashed and then bcrypt hashed", async () => {
    const password = "SecureExample!234";
    const digest = createHash("sha256").update(password).digest("hex");
    const stored = await hashPassword(password);
    assert.match(stored, /^\$2[aby]\$12\$/);
    assert.equal(await verifyPassword(digest, stored), true);
    assert.equal(await verifyPassword(password, stored), false);
});

test("signed session tokens preserve claims and reject tampering", () => {
    const token = signToken({ email: "admin@example.com", role: "admin" });
    assert.equal(verifyToken(token)?.email, "admin@example.com");
    assert.equal(verifyToken(`${token}x`), null);
});

test("rate limiter slides its window and returns Retry-After", () => {
    const req = { headers: {}, socket: { remoteAddress: "test-rate-limit-ip" } };
    const res = responseMock();
    assert.equal(rateLimit(req, "test-sliding-window", 1, 60_000, res), true);
    assert.equal(rateLimit(req, "test-sliding-window", 1, 60_000, res), false);
    assert.equal(res.headers["Retry-After"], "60");
});

test("request schema rejects unknown properties", () => {
    const result = validateSchema({
        email: { type: "string", required: true, max: 254 }
    }, { email: "admin@example.com", is_admin: true });
    assert.equal(result.valid, false);
    assert.match(result.error, /Unknown field/);
});

test("admin users API rejects unsigned requests and spoofed email headers", async () => {
    const req = {
        method: "GET",
        headers: { origin: "https://school.example", "x-admin-email": "admin@example.com" },
        socket: { remoteAddress: "test-admin-unauthorized" }
    };
    const res = responseMock();
    await adminUsersHandler(req, res);
    assert.equal(res.statusCode, 401);
});

test("session-backed APIs reject missing sessions instead of treating promises as authorization", async () => {
    const handlers = [
        [attendanceHandler, "GET", 403],
        [studentsHandler, "GET", 403],
        [studentsHandler, "POST", 403],
        [studentsHandler, "DELETE", 403],
        [teachersHandler, "GET", 403],
        [settingsHandler, "GET", 403],
        [settingsHandler, "HEAD", 403],
        [settingsHandler, "PUT", 403],
        [faceMatchHandler, "POST", 403],
        [sendWhatsAppHandler, "POST", 401]
    ];

    for (const [handler, method, expectedStatus] of handlers) {
        const req = requestMock(method, null, `test-unauth-${method}-${Math.random()}`);
        const res = responseMock();
        await handler(req, res);
        assert.equal(res.statusCode, expectedStatus, `${method} should reject a missing session`);
    }
});

test("database-backed role checks reject deactivated accounts and surface lookup outages", async t => {
    const originalFetch = globalThis.fetch;
    const teacherToken = signToken({ email: "teacher@example.com", role: "guru" });
    const studentToken = signToken({
        email: "student@example.com", role: "siswa", nisn: "12345678"
    });
    const reqFor = token => requestMock("GET", token, `test-inactive-${Math.random()}`);
    t.after(() => { globalThis.fetch = originalFetch; });

    globalThis.fetch = async () => new Response(JSON.stringify([
        { email: "teacher@example.com", is_active: false }
    ]), { status: 200 });
    assert.equal(await getRequestRole(reqFor(teacherToken)), null);

    globalThis.fetch = async () => new Response(JSON.stringify([
        { email: "student@example.com", nisn: "12345678", is_active: false }
    ]), { status: 200 });
    assert.equal(await getRequestRole(reqFor(studentToken)), null);

    globalThis.fetch = async () => { throw new TypeError("network unavailable"); };
    const res = responseMock();
    await teachersHandler(reqFor(teacherToken), res);
    assert.equal(res.statusCode, 503);
    assert.match(res.body.error, /temporarily unavailable/);
});

test("admin login issues a signed token and records a login", async t => {
    const password = "SecureExample!234";
    const passwordHash = await hashPassword(password);
    const digest = createHash("sha256").update(password).digest("hex");
    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
        requests.push({ url: String(url), method: init.method || "GET" });
        const data = String(url).includes("admin_users?select=")
            ? [{ email: "admin@example.com", name: "Admin", password_hash: passwordHash, is_active: true }]
            : [];
        return new Response(JSON.stringify(data), { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = {
        method: "POST",
        headers: { origin: "https://school.example" },
        socket: { remoteAddress: "test-admin-login" },
        body: { email: "admin@example.com", password: digest, captcha: "8" }
    };
    const res = responseMock();
    await adminLoginHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(verifyToken(res.body.token)?.role, "admin");
    assert.ok(requests.some(request => request.method === "PATCH"));
    assert.ok(requests.some(request => request.url.includes("audit_log")));
});

test("attendance returns machine-readable GPS errors and limits repeated failures", async t => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        const data = requestUrl.includes("school_settings")
            ? [{ lat: -6.25, lng: 106.6, radius: 35 }]
            : requestUrl.includes("students?select=email,nisn,is_active")
                ? [{ email: "student@example.com", nisn: "12345678", is_active: true }]
                : [];
        return new Response(JSON.stringify(data), { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const token = signToken({ email: "student@example.com", name: "Student", role: "siswa", nisn: "12345678" });
    const ip = `test-attendance-${Date.now()}`;
    let firstResponse;
    for (let attempt = 0; attempt < 7; attempt++) {
        const req = {
            method: "POST",
            headers: {
                origin: "https://school.example",
                "x-session-token": token,
                "x-idempotency-key": `00000000-0000-4000-8000-${String(attempt + 1).padStart(12, "0")}`
            },
            socket: { remoteAddress: ip },
            body: {
                nisn: "12345678", lat: -6.25, lng: 106.6,
                accuracy: 36, confidence: 0.9
            }
        };
        const res = responseMock();
        await attendanceHandler(req, res);
        if (attempt === 0) firstResponse = res;
        if (attempt < 6) {
            assert.equal(res.statusCode, 400);
            assert.deepEqual(res.body, {
                error: "GPS_ACCURACY_TOO_LOW",
                required: 35,
                actual: 36
            });
        } else {
            assert.equal(res.statusCode, 429);
            assert.equal(res.headers["Retry-After"], "60");
        }
    }
    assert.equal(firstResponse.statusCode, 400);
});
