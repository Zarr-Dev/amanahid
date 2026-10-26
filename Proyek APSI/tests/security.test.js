import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../api/_lib/admin-auth.js";
import { getRequestRole, rateLimit } from "../api/_lib/supabase.js";
import { validateSchema } from "../api/_lib/validate.js";
import adminUsersHandler from "../api/admin/users.js";
import healthHandler from "../api/health.js";
import adminLoginHandler from "../api/admin/login.js";
import authLoginHandler from "../api/auth/login.js";
import adminAuditHandler from "../api/admin/audit.js";
import adminDashboardStatsHandler from "../api/admin/dashboard-stats.js";
import adminProfileHandler from "../api/admin/profile.js";
import adminSettingsHandler from "../api/admin/settings.js";
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
        body: { email: "admin@example.com", password: digest, captcha: 8 }
    };
    const res = responseMock();
    await adminLoginHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(verifyToken(res.body.token)?.role, "admin");
    assert.ok(requests.some(request => request.method === "PATCH"));
    assert.ok(requests.some(request => request.url.includes("audit_log")));
});

test("admin APIs handle empty and null Supabase results", async t => {
    const originalFetch = globalThis.fetch;
    const token = signToken({ email: "admin@example.com", name: "Admin", role: "admin" });
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        if (requestUrl.includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: null, is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("select=id&")) {
            return new Response("[]", {
                status: 200,
                headers: { "content-range": "*/0" }
            });
        }
        return new Response("null", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const request = (method, route) => ({
        method,
        headers: {
            origin: "https://school.example",
            "x-admin-token": token
        },
        query: {},
        socket: { remoteAddress: `test-admin-null-${route}-${Math.random()}` }
    });

    const usersResponse = responseMock();
    await adminUsersHandler(request("GET", "users"), usersResponse);
    assert.equal(usersResponse.statusCode, 200);
    assert.deepEqual(usersResponse.body.users, []);

    const settingsResponse = responseMock();
    await adminSettingsHandler(request("GET", "settings"), settingsResponse);
    assert.equal(settingsResponse.statusCode, 200);
    assert.equal(settingsResponse.body.radius, 35);

    const auditResponse = responseMock();
    await adminAuditHandler(request("GET", "audit"), auditResponse);
    assert.equal(auditResponse.statusCode, 200);
    assert.deepEqual(auditResponse.body.entries, []);

    const statsResponse = responseMock();
    await adminDashboardStatsHandler(request("GET", "stats"), statsResponse);
    assert.equal(statsResponse.statusCode, 200);
    assert.equal(statsResponse.body.total_students, 0);

    const profileRequest = request("PUT", "profile");
    profileRequest.body = {
        current_password: "a".repeat(64),
        password: "SecureExample!234"
    };
    const profileResponse = responseMock();
    await adminProfileHandler(profileRequest, profileResponse);
    assert.equal(profileResponse.statusCode, 401);

    const loginRequest = request("POST", "login");
    loginRequest.headers = { origin: "https://school.example" };
    loginRequest.body = {
        email: "admin@example.com",
        password: "a".repeat(64),
        captcha: 8
    };
    const loginResponse = responseMock();
    await adminLoginHandler(loginRequest, loginResponse);
    assert.equal(loginResponse.statusCode, 401);

    const invalidCaptchaRequest = request("POST", "invalid-captcha");
    invalidCaptchaRequest.headers = { origin: "https://school.example" };
    invalidCaptchaRequest.body = {
        email: "admin@example.com",
        password: "a".repeat(64),
        captcha: " 8"
    };
    const invalidCaptchaResponse = responseMock();
    await adminLoginHandler(invalidCaptchaRequest, invalidCaptchaResponse);
    assert.equal(invalidCaptchaResponse.statusCode, 400);
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


test("API health endpoint answers GET/HEAD and rejects other methods clearly", async () => {
    const getResponse = responseMock();
    await healthHandler({ method: "GET" }, getResponse);
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.body.ok, true);
    assert.equal(getResponse.body.service, "Amanah.id API");
    assert.match(getResponse.body.runtime, /^v?\d+\./);

    const headResponse = responseMock();
    await healthHandler({ method: "HEAD" }, headResponse);
    assert.equal(headResponse.statusCode, 200);

    const postResponse = responseMock();
    await healthHandler({ method: "POST" }, postResponse);
    assert.equal(postResponse.statusCode, 405);
    assert.deepEqual(postResponse.body, { error: "Method not allowed", method: "POST" });
});

test("Admin-created user schema explicitly rejects student role", async t => {
    const originalFetch = globalThis.fetch;
    const adminToken = signToken({ email: "admin@example.com", name: "Admin", role: "admin" });
    globalThis.fetch = async () => new Response(JSON.stringify([
        { email: "admin@example.com", name: "Admin", is_active: true }
    ]), { status: 200 });
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = {
        method: "POST",
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: "test-admin-student-role-denied" },
        body: { role: "siswa", email: "student@example.com", name: "Student", password: "SecureExample!234" }
    };
    const res = responseMock();
    await adminUsersHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /role/i);
});


test("user login resolves Guru and Siswa against the matching Supabase tables", async t => {
    const originalFetch = globalThis.fetch;
    const password = "SecureExample!234";
    const passwordHash = await hashPassword(password);
    const passwordDigest = createHash("sha256").update(password).digest("hex");
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        requests.push({ url: requestUrl, method: init.method || "GET" });
        if (requestUrl.includes("teachers?select=email,name,password_hash,is_active")) {
            return new Response(JSON.stringify(requestUrl.includes("guru%40example.com")
                ? [{ email: "guru@example.com", name: "Guru Test", password_hash: passwordHash, is_active: true }]
                : []), { status: 200 });
        }
        if (requestUrl.includes("students?select=email,name,nisn,password_hash,is_active")) {
            return new Response(JSON.stringify([{ email: "siswa@example.com", name: "Siswa Test", nisn: "12345678", password_hash: passwordHash, is_active: true }]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    for (const account of [
        { email: "guru@example.com", role: "guru" },
        { email: "siswa@example.com", role: "siswa" }
    ]) {
        const req = {
            method: "POST",
            headers: { origin: "https://school.example" },
            socket: { remoteAddress: `test-login-${account.role}` },
            body: { email: account.email, password: passwordDigest }
        };
        const res = responseMock();
        await authLoginHandler(req, res);
        assert.equal(res.statusCode, 200, `${account.role} login should succeed against its database table`);
        assert.equal(res.body.user.role, account.role);
        assert.equal(verifyToken(res.body.token)?.role, account.role);
    }
    assert.ok(requests.some(request => request.url.includes("teachers?select=")));
    assert.ok(requests.some(request => request.url.includes("students?select=")));
});
