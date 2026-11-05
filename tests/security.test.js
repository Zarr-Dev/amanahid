import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../api/_lib/admin-auth.js";
import { createLoginCaptcha, verifyLoginCaptcha } from "../api/_lib/login-captcha.js";
import { getClientIp, getMissingAuthConfiguration, getRequestRole, isAllowedOrigin, rateLimit } from "../api/_lib/supabase.js";
import { validateSchema } from "../api/_lib/validate.js";
import adminUsersHandler from "../api/admin/users.js";
import healthHandler from "../api/settings.js";
import adminLoginHandler from "../api/admin/login.js";
import authLoginHandler from "../api/auth/login.js";
import adminAuditHandler from "../api/admin/audit.js";
import adminDashboardStatsHandler from "../api/admin/audit.js";
import adminProfileHandler from "../api/admin/settings.js";
import adminSettingsHandler from "../api/admin/settings.js";
import attendanceHandler from "../api/attendance.js";
import absenceHandler from "../api/absence.js";
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
    const digest = createHash("sha256").update(String(ip)).digest();
    const remoteAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(String(ip))
        ? ip
        : `198.18.${digest[0]}.${digest[1]}`;
    return {
        method,
        headers: {
            origin: "https://school.example",
            ...(token ? { "x-session-token": token } : {})
        },
        socket: { remoteAddress }
    };
}

test("login CAPTCHA uses encrypted, expiring, server-verified challenges", () => {
    const challenge = createLoginCaptcha("en");
    assert.match(challenge.question, /[A-Za-z]/);
    assert.equal(typeof challenge.token, "string");
    assert.equal(verifyLoginCaptcha(challenge.token, challenge.answer), true);
    assert.equal(verifyLoginCaptcha(challenge.token, "definitely-wrong"), false);
    assert.equal(verifyLoginCaptcha(`${challenge.token}x`, challenge.answer), false);
    assert.equal(verifyLoginCaptcha(challenge.token, ""), false);
});

test("login CAPTCHA endpoint returns only a challenge prompt and encrypted token", async () => {
    const res = responseMock();
    await authLoginHandler({
        method: "GET",
        query: { action: "captcha", lang: "en" },
        headers: { origin: "https://school.example" },
        socket: { remoteAddress: "test-captcha-endpoint" }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(typeof res.body.question, "string");
    assert.equal(typeof res.body.token, "string");
    assert.equal("answer" in res.body, false);
    assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
});

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

test("Vercel client IP headers are validated and preferred over forwarded chains", () => {
    assert.equal(getClientIp({
        headers: {
            "x-vercel-forwarded-for": "203.0.113.10",
            "x-forwarded-for": "198.51.100.20"
        },
        socket: { remoteAddress: "192.0.2.1" }
    }), "203.0.113.10");
    assert.equal(getClientIp({
        headers: { "x-forwarded-for": "198.51.100.20, 10.0.0.1" },
        socket: { remoteAddress: "192.0.2.1" }
    }), "192.0.2.1");
});

test("origin validation rejects lookalike hosts and path-bearing Origin headers", () => {
    process.env.APP_ORIGIN = "https://school.example/";
    assert.equal(isAllowedOrigin({ headers: { origin: "https://school.example" } }), true);
    assert.equal(isAllowedOrigin({ headers: { origin: "https://school.example.attacker.invalid" } }), false);
    assert.equal(isAllowedOrigin({ headers: { origin: "https://school.example/path" } }), false);
    assert.equal(isAllowedOrigin({ headers: {} }), false);
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
    const captcha = createLoginCaptcha("id");
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
        body: { email: "admin@example.com", password: digest, captchaToken: captcha.token, captchaAnswer: captcha.answer }
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
    assert.equal(settingsResponse.body.radius, 50);

    const auditResponse = responseMock();
    await adminAuditHandler(request("GET", "audit"), auditResponse);
    assert.equal(auditResponse.statusCode, 200);
    assert.deepEqual(auditResponse.body.entries, []);

    const statsRequest = request("GET", "stats");
    statsRequest.query.action = "stats";
    const statsResponse = responseMock();
    await adminDashboardStatsHandler(statsRequest, statsResponse);
    assert.equal(statsResponse.statusCode, 200);
    assert.equal(statsResponse.body.total_students, 0);
    assert.equal(typeof statsResponse.body.generated_at, "string");
    assert.equal(statsResponse.body.trend.length, 7);
    assert.ok(statsResponse.body.trend.every(point => /^\d{4}-\d{2}-\d{2}$/.test(point.date) && point.count === 0));

    const profileRequest = request("PUT", "profile");
    profileRequest.query.action = "profile";
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
        ...(() => { const captcha = createLoginCaptcha("id"); return { captchaToken: captcha.token, captchaAnswer: captcha.answer }; })()
    };
    const loginResponse = responseMock();
    await adminLoginHandler(loginRequest, loginResponse);
    assert.equal(loginResponse.statusCode, 401);

    const invalidCaptchaRequest = request("POST", "invalid-captcha");
    invalidCaptchaRequest.headers = { origin: "https://school.example" };
    invalidCaptchaRequest.body = {
        email: "admin@example.com",
        password: "a".repeat(64),
        captchaToken: createLoginCaptcha("id").token,
        captchaAnswer: "wrong"
    };
    const invalidCaptchaResponse = responseMock();
    await adminLoginHandler(invalidCaptchaRequest, invalidCaptchaResponse);
    assert.equal(invalidCaptchaResponse.statusCode, 400);
});

test("ArcFace 512D match uses the private pgvector RPC and issues a short-lived attendance proof", async t => {
    const originalFetch = globalThis.fetch;
    const teacherId = "11111111-1111-4111-8111-111111111111";
    const studentId = "33333333-3333-4333-8333-333333333333";
    const teacherToken = signToken({ email: "guru@example.com", name: "Guru", role: "guru" });
    const embedding = [1, ...Array.from({ length: 511 }, () => 0)];
    const requests = [];
    let auditWritten = false;
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        requests.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([{ email: "guru@example.com", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("teachers?select=id&email=eq.guru%40example.com")) {
            return new Response(JSON.stringify([{ id: teacherId }]), { status: 200 });
        }
        if (requestUrl.includes("/rpc/match_student_face_embeddings")) {
            return new Response(JSON.stringify([{
                student_id: studentId, nisn: "12345678", name: "Student", distance: 0.11
            }]), { status: 200 });
        }
        if (requestUrl.includes("audit_log") && init.method === "POST") {
            auditWritten = true;
            return new Response("[]", { status: 201 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const res = responseMock();
    await faceMatchHandler({
        method: "POST",
        headers: { origin: "https://school.example", "x-session-token": teacherToken },
        socket: { remoteAddress: "test-teacher-face-match-v2" },
        body: { model_key: "auraface-glintr100-int8-v1", embedding }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.match, true);
    assert.equal(res.body.nisn, "12345678");
    assert.equal(res.body.model_key, "auraface-glintr100-int8-v1");
    const proof = verifyToken(res.body.proofToken);
    assert.equal(proof?.purpose, "attendance_face");
    assert.equal(proof?.role, "guru");
    assert.equal(proof?.nisn, "12345678");
    const rpc = requests.find(item => item.url.includes("/rpc/match_student_face_embeddings"));
    assert.ok(rpc, "face search must be performed in the private database RPC");
    assert.equal(JSON.parse(rpc.body).p_teacher_id, teacherId, "teacher search must be scoped to the assigned homeroom");
    assert.equal(JSON.parse(rpc.body).p_query_embeddings[0].embedding.length, 512);
    assert.equal(requests.some(item => item.url.includes("face_descriptors")), false,
        "the server must not download legacy face galleries");
    assert.equal(auditWritten, true);
});

test("ArcFace matching rejects an ambiguous pair instead of selecting one student", async t => {
    const originalFetch = globalThis.fetch;
    const teacherId = "22222222-2222-4222-8222-222222222222";
    const teacherToken = signToken({ email: "guru@example.com", name: "Guru", role: "guru" });
    const embedding = [1, ...Array.from({ length: 511 }, () => 0)];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([{ email: "guru@example.com", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("teachers?select=id&email=eq.guru%40example.com")) {
            return new Response(JSON.stringify([{ id: teacherId }]), { status: 200 });
        }
        if (requestUrl.includes("/rpc/match_student_face_embeddings")) {
            return new Response(JSON.stringify([
                { student_id: "33333333-3333-4333-8333-333333333333", nisn: "12345678", name: "Student A", distance: 0.10 },
                { student_id: "44444444-4444-4444-8444-444444444444", nisn: "87654321", name: "Student B", distance: 0.12 }
            ]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const res = responseMock();
    await faceMatchHandler({
        method: "POST",
        headers: { origin: "https://school.example", "x-session-token": teacherToken },
        socket: { remoteAddress: "test-face-ambiguous-v2" },
        body: { model_key: "auraface-glintr100-int8-v1", embedding }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.registered, true);
    assert.equal(res.body.match, false);
    assert.equal(res.body.ambiguous, true);
    assert.equal(res.body.proofToken, undefined);
});

test("student ArcFace matching is constrained to the authenticated student's row", async t => {
    const originalFetch = globalThis.fetch;
    const studentId = "55555555-5555-4555-8555-555555555555";
    const studentToken = signToken({ email: "student@example.com", name: "Student", role: "siswa", nisn: "12345678" });
    const embedding = [1, ...Array.from({ length: 511 }, () => 0)];
    let rpcPayload = null;
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes("students?select=email,nisn,is_active")) {
            return new Response(JSON.stringify([{ email: "student@example.com", nisn: "12345678", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("students?select=id,nisn,name,is_active")) {
            return new Response(JSON.stringify([{ id: studentId, nisn: "12345678", name: "Student", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("/rpc/match_student_face_embeddings")) {
            rpcPayload = JSON.parse(init.body);
            return new Response(JSON.stringify([{
                student_id: studentId, nisn: "12345678", name: "Student", distance: 0.14
            }]), { status: 200 });
        }
        return new Response("[]", { status: 201 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const res = responseMock();
    await faceMatchHandler({
        method: "POST",
        headers: { origin: "https://school.example", "x-session-token": studentToken },
        socket: { remoteAddress: "test-student-face-scope-v2" },
        body: { model_key: "auraface-glintr100-int8-v1", embedding }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.match, true);
    assert.equal(rpcPayload.p_student_id, studentId);
    assert.equal(rpcPayload.p_teacher_id, null);
});

test("ArcFace API rejects wrong model versions and non-normalized 512D embeddings", async t => {
    const originalFetch = globalThis.fetch;
    const teacherToken = signToken({ email: "guru@example.com", name: "Guru", role: "guru" });
    let rpcCalled = false;
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        if (requestUrl.includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([{ email: "guru@example.com", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("/rpc/match_student_face_embeddings")) rpcCalled = true;
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const wrongModel = responseMock();
    await faceMatchHandler({
        method: "POST",
        headers: { origin: "https://school.example", "x-session-token": teacherToken },
        socket: { remoteAddress: "test-face-model-version" },
        body: { model_key: "old-model", embedding: [1, ...Array.from({ length: 511 }, () => 0)] }
    }, wrongModel);
    assert.equal(wrongModel.statusCode, 409);

    const invalidEmbedding = responseMock();
    await faceMatchHandler({
        method: "POST",
        headers: { origin: "https://school.example", "x-session-token": teacherToken },
        socket: { remoteAddress: "test-face-model-norm" },
        body: { model_key: "auraface-glintr100-int8-v1", embedding: Array.from({ length: 512 }, () => 0.5) }
    }, invalidEmbedding);
    assert.equal(invalidEmbedding.statusCode, 400);
    assert.equal(rpcCalled, false);
});

test("student attendance rejects requests without a recent server-verified face proof", async t => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = async url => {
        fetchCalls++;
        const requestUrl = String(url);
        const rows = requestUrl.includes("students?select=email,nisn,is_active")
            ? [{ email: "student@example.com", nisn: "12345678", is_active: true }]
            : [];
        return new Response(JSON.stringify(rows), { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const token = signToken({ email: "student@example.com", name: "Student", role: "siswa", nisn: "12345678" });
    const res = responseMock();
    await attendanceHandler({
        method: "POST",
        headers: { origin: "https://school.example", "x-session-token": token, "x-idempotency-key": "00000000-0000-4000-8000-000000000099" },
        socket: { remoteAddress: "test-attendance-no-face-proof" },
        body: { nisn: "12345678", lat: -6.25, lng: 106.6, accuracy: 10, gpsTimestamp: Date.now(), speed: 0, confidence: 1 }
    }, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /server-verified face match/i);
    assert.equal(fetchCalls, 1, "the endpoint must reject before querying attendance or inserting a record");
});
test("attendance returns machine-readable GPS errors and limits repeated failures", async t => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        const data = requestUrl.includes("school_settings")
            ? [{ lat: -6.25, lng: 106.6, radius: 50 }]
            : requestUrl.includes("students?select=email,nisn,is_active")
                ? [{ email: "student@example.com", nisn: "12345678", is_active: true }]
                : [];
        return new Response(JSON.stringify(data), { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const token = signToken({ email: "student@example.com", name: "Student", role: "siswa", nisn: "12345678" });
    const ip = "198.18.44.1";
    let firstResponse;
    for (let attempt = 0; attempt < 7; attempt++) {
        const req = {
            method: "POST",
            headers: {
                origin: "https://school.example",
                "x-session-token": token,
                "x-face-proof": signToken({
                    email: "student@example.com", role: "siswa", nisn: "12345678",
                    purpose: "attendance_face", faceVerified: true, confidence: 0.9
                }, 120_000),
                "x-idempotency-key": `00000000-0000-4000-8000-${String(attempt + 1).padStart(12, "0")}`
            },
            socket: { remoteAddress: ip },
            body: {
                nisn: "12345678", lat: -6.25, lng: 106.6,
                accuracy: 51, gpsTimestamp: Date.now(), speed: 0, confidence: 0.9
            }
        };
        const res = responseMock();
        await attendanceHandler(req, res);
        if (attempt === 0) firstResponse = res;
        if (attempt < 6) {
            assert.equal(res.statusCode, 400);
            assert.deepEqual(res.body, {
                error: "GPS_ACCURACY_TOO_LOW",
                required: 50,
                actual: 51
            });
        } else {
            assert.equal(res.statusCode, 429);
            assert.equal(res.headers["Retry-After"], "60");
        }
    }
    assert.equal(firstResponse.statusCode, 400);
});


test("attendance rejects GPS fixes whose uncertainty overlaps the geofence boundary", async t => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        if (requestUrl.includes("students?select=email,nisn,is_active")) {
            return new Response(JSON.stringify([{ email: "student@example.com", nisn: "12345678", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("school_settings?select=lat,lng,radius")) {
            return new Response(JSON.stringify([{ lat: -6.25, lng: 106.6, radius: 50 }]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const token = signToken({ email: "student@example.com", name: "Student", role: "siswa", nisn: "12345678" });
    const res = responseMock();
    await attendanceHandler({
        method: "POST",
        headers: {
            origin: "https://school.example",
            "x-session-token": token,
            "x-face-proof": signToken({
                email: "student@example.com", role: "siswa", nisn: "12345678",
                purpose: "attendance_face", faceVerified: true, confidence: 0.9
            }, 120_000),
            "x-idempotency-key": "00000000-0000-4000-8000-000000000188"
        },
        socket: { remoteAddress: "198.18.44.2" },
        body: {
            nisn: "12345678", lat: -6.25, lng: 106.6004,
            accuracy: 10, gpsTimestamp: Date.now(), speed: 0, confidence: 0.9
        }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "GPS_BOUNDARY_UNCERTAIN");
    assert.equal(res.body.radius, 50);
    assert.ok(res.body.distance >= 40 && res.body.distance <= 50);
});

test("attendance rejects invalid school geofence configuration before accepting a GPS fix", async t => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        if (requestUrl.includes("students?select=email,nisn,is_active")) {
            return new Response(JSON.stringify([{ email: "student@example.com", nisn: "12345678", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("school_settings?select=lat,lng,radius,entry_time")) {
            return new Response(JSON.stringify([{ lat: -6.25, lng: 106.6, radius: 900 }]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const token = signToken({ email: "student@example.com", name: "Student", role: "siswa", nisn: "12345678" });
    const res = responseMock();
    await attendanceHandler({
        method: "POST",
        headers: {
            origin: "https://school.example",
            "x-session-token": token,
            "x-face-proof": signToken({
                email: "student@example.com", role: "siswa", nisn: "12345678",
                purpose: "attendance_face", faceVerified: true, confidence: 0.9
            }, 120_000),
            "x-idempotency-key": "00000000-0000-4000-8000-000000000189"
        },
        socket: { remoteAddress: "198.18.44.3" },
        body: {
            nisn: "12345678", lat: -6.25, lng: 106.6,
            accuracy: 10, gpsTimestamp: Date.now(), speed: 0, confidence: 0.9
        }
    }, res);
    assert.equal(res.statusCode, 503);
    assert.match(res.body.error, /School location settings are invalid/);
});

test("authentication endpoints clearly report missing production configuration before origin checks", async t => {
    const keys = ["APP_ORIGIN", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SESSION_SECRET", "FONNTE_TOKEN"];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    t.after(() => {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    });
    for (const key of keys) delete process.env[key];

    assert.deepEqual(getMissingAuthConfiguration(), [
        "APP_ORIGIN", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SESSION_SECRET (minimum 32 characters)"
    ]);

    const adminRes = responseMock();
    await adminLoginHandler({
        method: "POST",
        headers: { origin: "https://school.example" },
        socket: { remoteAddress: "test-missing-config-admin" },
        body: { email: "admin@example.com", password: "a".repeat(64), captcha: 8 }
    }, adminRes);
    assert.equal(adminRes.statusCode, 503);
    assert.match(adminRes.body.error, /belum dikonfigurasi/);
    assert.doesNotMatch(adminRes.body.error, /APP_ORIGIN|SUPABASE_URL|SUPABASE_SECRET_KEY|SESSION_SECRET/);

    const userRes = responseMock();
    await authLoginHandler({
        method: "POST",
        headers: { origin: "https://school.example" },
        socket: { remoteAddress: "test-missing-config-user" },
        body: { email: "student@example.com", password: "a".repeat(64) }
    }, userRes);
    assert.equal(userRes.statusCode, 503);
    assert.match(userRes.body.error, /belum dikonfigurasi/);

    const healthRes = responseMock();
    await healthHandler({ method: "GET", headers: { origin: "https://school.example" }, query: { action: "health" } }, healthRes);
    assert.equal(healthRes.statusCode, 200);
    assert.equal(healthRes.body.authentication.configured, false);
    assert.equal("missing" in healthRes.body.authentication, false);
});

test("API health endpoint answers GET/HEAD and rejects other methods clearly", async () => {
    const getResponse = responseMock();
    await healthHandler({ method: "GET", headers: { origin: "https://school.example" }, query: { action: "health" } }, getResponse);
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.body.ok, true);
    assert.equal(getResponse.body.service, "Amanah.id API");
    assert.equal(getResponse.body.runtime, undefined);
    assert.equal(getResponse.headers["Cache-Control"], "no-store, max-age=0");

    const headResponse = responseMock();
    await healthHandler({ method: "HEAD", headers: { origin: "https://school.example" }, query: { action: "health" } }, headResponse);
    assert.equal(headResponse.statusCode, 200);

    const postResponse = responseMock();
    await healthHandler({ method: "POST", headers: { origin: "https://school.example" }, query: { action: "health" } }, postResponse);
    assert.equal(postResponse.statusCode, 405);
    assert.deepEqual(postResponse.body, { error: "Method not allowed", method: "POST" });
});

test("API readiness separates downstream readiness from API liveness", async t => {
    const keys = ["APP_ORIGIN", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SESSION_SECRET"];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    const originalFetch = globalThis.fetch;
    t.after(() => {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
        globalThis.fetch = originalFetch;
    });

    process.env.APP_ORIGIN = "https://school.example";
    process.env.SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SECRET_KEY = "test-service-secret";
    process.env.SESSION_SECRET = "test-session-secret-with-more-than-32-characters";
    process.env.FONNTE_TOKEN = "";

    globalThis.fetch = async () => new Response(JSON.stringify([{ id: "school-settings" }]), { status: 200 });
    const readyResponse = responseMock();
    await healthHandler({ method: "GET", query: { action: "ready" } }, readyResponse);
    assert.equal(readyResponse.statusCode, 200);
    assert.equal(readyResponse.body.ok, true);
    assert.equal(readyResponse.body.checks.database, "ok");
    assert.equal(readyResponse.body.checks.whatsapp, "not_configured");

    globalThis.fetch = async () => { throw new TypeError("network unavailable"); };
    const failedReadyResponse = responseMock();
    await healthHandler({ method: "GET", query: { action: "ready" } }, failedReadyResponse);
    assert.equal(failedReadyResponse.statusCode, 503);
    assert.equal(failedReadyResponse.body.ok, false);
    assert.equal(failedReadyResponse.body.checks.api, "ok");
    assert.equal(failedReadyResponse.body.checks.database, "error");
});

test("Admin can create a Siswa login with NISN and class, but face enrollment remains required", async t => {
    const originalFetch = globalThis.fetch;
    const adminToken = signToken({ email: "admin@example.com", name: "Admin", role: "admin" });
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        requests.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: "Admin", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("teachers?select=id,name,homeroom_class,is_active&id=")) {
            return new Response(JSON.stringify([{
                id: "223e4567-e89b-42d3-a456-426614174000",
                name: "Teacher Demo",
                homeroom_class: null,
                is_active: true
            }]), { status: 200 });
        }
        if (requestUrl.includes("students?select=id&email=") ||
            requestUrl.includes("teachers?select=id&email=") ||
            requestUrl.includes("students?select=id&nisn=")) {
            return new Response("[]", { status: 200 });
        }
        if (requestUrl.includes("students?select=id,nisn,email,name,class_name,homeroom_teacher_id,created_at") &&
            init.method === "POST") {
            return new Response(JSON.stringify([{
                id: "123e4567-e89b-42d3-a456-426614174000",
                nisn: "1234567890",
                email: "student@example.com",
                name: "Student Demo",
                class_name: "XI IPA 1",
                homeroom_teacher_id: "223e4567-e89b-42d3-a456-426614174000",
                created_at: "2026-10-26T00:00:00Z"
            }]), { status: 201 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = {
        method: "POST",
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: "test-admin-student-create" },
        body: {
            role: "siswa",
            email: "student@example.com",
            name: "Student Demo",
            password: "SecureExample!234",
            nisn: "1234567890",
            class_name: "XI IPA 1",
            homeroom_teacher_id: "223e4567-e89b-42d3-a456-426614174000"
        }
    };
    const res = responseMock();
    await adminUsersHandler(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.user.role, "siswa");
    assert.equal(res.body.user.face_enrollment_required, true);
    const insert = requests.find(request => request.method === "POST" && request.url.includes("students?select=id,nisn,email,name,class_name,homeroom_teacher_id,created_at"));
    assert.ok(insert);
    assert.deepEqual(JSON.parse(insert.body).face_descriptors, []);
    assert.equal(JSON.parse(insert.body).homeroom_teacher_id, "223e4567-e89b-42d3-a456-426614174000");
    assert.ok(requests.some(request => request.url.includes("audit_log")));
});


test("Admin cannot provision a Guru or Siswa with an email already held by an Admin account", async t => {
    const keys = ["APP_ORIGIN", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SESSION_SECRET"];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    const originalFetch = globalThis.fetch;
    t.after(() => {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
        globalThis.fetch = originalFetch;
    });
    process.env.APP_ORIGIN = "https://school.example";
    process.env.SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SECRET_KEY = "test-service-secret";
    process.env.SESSION_SECRET = "test-session-secret-with-more-than-32-characters";

    const adminToken = signToken({ email: "admin@example.com", name: "Admin", role: "admin" });
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        requests.push({ url: requestUrl, method: init.method || "GET" });
        if (requestUrl.includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: "Admin", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("admin_users?select=id&email=")) {
            return new Response(JSON.stringify([{ id: "existing-admin" }]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };

    const req = {
        method: "POST",
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: "test-cross-role-email-collision" },
        body: {
            role: "guru",
            email: "admin@example.com",
            name: "Another account",
            password: "SecureExample!234"
        }
    };
    const res = responseMock();
    await adminUsersHandler(req, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /email already exists/i);
    assert.equal(requests.some(request => request.method === "POST"), false);
});

test("attendance API blocks bulk deletion even for a signed-in teacher", async t => {
    const keys = ["APP_ORIGIN", "SUPABASE_URL", "SUPABASE_SECRET_KEY"];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    const originalFetch = globalThis.fetch;
    t.after(() => {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
        globalThis.fetch = originalFetch;
    });
    process.env.APP_ORIGIN = "https://school.example";
    process.env.SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SECRET_KEY = "test-service-secret";
    globalThis.fetch = async url => {
        if (String(url).includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([
                { email: "teacher@example.com", is_active: true }
            ]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };

    const teacherToken = signToken({ email: "teacher@example.com", role: "guru" });
    const req = requestMock("DELETE", teacherToken, "test-attendance-bulk-delete-denied");
    req.query = { all: "1" };
    const res = responseMock();
    await attendanceHandler(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Bulk attendance deletion is disabled/);
});


test("teacher with no linked homeroom students receives an empty request list", async t => {
    const originalFetch = globalThis.fetch;
    const teacherId = "11111111-1111-4111-8111-111111111111";
    const teacherToken = signToken({ email: "teacher@example.com", role: "guru" });
    const requests = [];
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        requests.push(requestUrl);
        if (requestUrl.includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([{ email: "teacher@example.com", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("teachers?select=id,name,email,homeroom_class")) {
            return new Response(JSON.stringify([{
                id: teacherId, name: "Teacher", email: "teacher@example.com", homeroom_class: null
            }]), { status: 200 });
        }
        if (requestUrl.includes("absence_requests?select=*,students!inner")) {
            return new Response("[]", { status: 200 });
        }
        if (requestUrl.includes("teacher_notifications?select=id,title,body,related_id,created_at")) {
            return new Response("[]", { status: 200 });
        }
        throw new Error("Unexpected data query: " + requestUrl);
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("GET", teacherToken, "test-absence-no-linked-students");
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.requests, []);
    assert.ok(requests.some(url => url.includes("students.homeroom_teacher_id=eq." + teacherId)));
});

test("teacher absence list is scoped to the exact homeroom teacher relationship", async t => {
    const originalFetch = globalThis.fetch;
    const teacherId = "22222222-2222-4222-8222-222222222222";
    const teacherToken = signToken({ email: "teacher@example.com", role: "guru" });
    const requests = [];
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        requests.push(requestUrl);
        if (requestUrl.includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([{ email: "teacher@example.com", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("teachers?select=id,name,email,homeroom_class")) {
            return new Response(JSON.stringify([{
                id: teacherId, name: "Teacher", email: "teacher@example.com", homeroom_class: "XIA"
            }]), { status: 200 });
        }
        if (requestUrl.includes("absence_requests?select=*,students!inner")) {
            return new Response("[]", { status: 200 });
        }
        if (requestUrl.includes("teacher_notifications?select=id,title,body,related_id,created_at")) {
            return new Response("[]", { status: 200 });
        }
        throw new Error("Unexpected data query: " + requestUrl);
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("GET", teacherToken, "test-absence-homeroom-scope");
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(requests.some(url => url.includes("students.homeroom_teacher_id=eq." + teacherId)));
});

test("teacher WhatsApp messages are queued only for parent contacts in the assigned homeroom", async t => {
    const originalFetch = globalThis.fetch;
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SECRET_KEY;
    const previousFonnte = process.env.FONNTE_TOKEN;
    process.env.SUPABASE_URL = "https://mock-project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "service-role-test";
    process.env.FONNTE_TOKEN = "fonnte-test-token";
    const teacherId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const target = "6281234567890";
    let fonnteCalls = 0;
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes("teachers?select=email,is_active")) return new Response(JSON.stringify([{ email: "teacher@example.com", is_active: true }]), { status: 200 });
        if (requestUrl.includes("system_settings?id=eq.00000000-0000-0000-0000-000000000002")) return new Response(JSON.stringify([{ feature_flags: { parent_notifications: true } }]), { status: 200 });
        if (requestUrl.includes("teachers?select=id&email=eq.teacher%40example.com")) return new Response(JSON.stringify([{ id: teacherId }]), { status: 200 });
        if (requestUrl.includes("students?select=id&is_active=eq.true&homeroom_teacher_id=eq." + teacherId)) return new Response(JSON.stringify([{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }]), { status: 200 });
        if (requestUrl === "https://api.fonnte.com/send") {
            fonnteCalls += 1;
            assert.ok(init.body instanceof FormData);
            assert.equal(init.body.get("target"), target);
            assert.equal(init.body.get("connectOnly"), "false");
            return new Response(JSON.stringify({ status: true, process: "pending", requestid: 123, id: ["456"] }), { status: 200 });
        }
        if (requestUrl.includes("audit_log")) return new Response("[]", { status: 201 });
        throw new Error("Unexpected request: " + requestUrl);
    };
    t.after(() => {
        globalThis.fetch = originalFetch;
        for (const [key, value] of [["SUPABASE_URL", previousUrl], ["SUPABASE_SECRET_KEY", previousKey], ["FONNTE_TOKEN", previousFonnte]]) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    });
    const token = signToken({ email: "teacher@example.com", role: "guru" });
    const req = requestMock("POST", token, "test-teacher-parent-whatsapp");
    req.body = { target, message: "Amanah ID: pemberitahuan untuk orang tua siswa." };
    const res = responseMock();
    await sendWhatsAppHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.queued, true);
    assert.equal(res.body.process, "pending");
    assert.equal(fonnteCalls, 1);
});

test("teacher WhatsApp endpoint denies parent contacts outside the assigned homeroom", async t => {
    const originalFetch = globalThis.fetch;
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_URL = "https://mock-project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "service-role-test";
    const teacherId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    let fonnteCalls = 0;
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes("teachers?select=email,is_active")) return new Response(JSON.stringify([{ email: "teacher@example.com", is_active: true }]), { status: 200 });
        if (requestUrl.includes("system_settings?id=eq.00000000-0000-0000-0000-000000000002")) return new Response(JSON.stringify([{ feature_flags: { parent_notifications: true } }]), { status: 200 });
        if (requestUrl.includes("teachers?select=id&email=eq.teacher%40example.com")) return new Response(JSON.stringify([{ id: teacherId }]), { status: 200 });
        if (requestUrl.includes("students?select=id&is_active=eq.true&homeroom_teacher_id=eq." + teacherId)) return new Response("[]", { status: 200 });
        if (requestUrl === "https://api.fonnte.com/send") { fonnteCalls += 1; throw new Error("Fonnte must not be called"); }
        throw new Error("Unexpected request: " + requestUrl);
    };
    t.after(() => {
        globalThis.fetch = originalFetch;
        if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
        if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = previousKey;
    });
    const token = signToken({ email: "teacher@example.com", role: "guru" });
    const req = requestMock("POST", token, "test-teacher-cross-homeroom-whatsapp");
    req.body = { target: "6289876543210", message: "Amanah ID: pemberitahuan yang tidak diizinkan." };
    const res = responseMock();
    await sendWhatsAppHandler(req, res);
    assert.equal(res.statusCode, 404);
    assert.equal(fonnteCalls, 0);
});
test("assigned Walas can revoke an approved absence and the API records the transition", async t => {
    const originalFetch = globalThis.fetch;
    const teacherId = "88888888-8888-4888-8888-888888888888";
    const requestId = "99999999-9999-4999-8999-999999999999";
    const teacherToken = signToken({ email: "teacher@example.com", name: "Teacher", role: "guru" });
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("teachers?select=email,is_active")) return new Response(JSON.stringify([{ email: "teacher@example.com", is_active: true }]), { status: 200 });
        if (requestUrl.includes("teachers?select=id,name,email,homeroom_class&email=eq.teacher%40example.com")) return new Response(JSON.stringify([{ id: teacherId, name: "Teacher", email: "teacher@example.com", homeroom_class: "XI IPA 1" }]), { status: 200 });
        if (requestUrl.includes("absence_requests?id=eq." + requestId) && requestUrl.includes("students!inner(homeroom_teacher_id)")) return new Response(JSON.stringify([{ id: requestId, students: { homeroom_teacher_id: teacherId } }]), { status: 200 });
        if (requestUrl.includes("absence_requests?id=eq." + requestId) && init.method === "PATCH") {
            const payload = JSON.parse(init.body);
            assert.equal(payload.status, "revoked");
            assert.equal(payload.reviewed_by, "teacher@example.com");
            return new Response(JSON.stringify([{ id: requestId, student_id: "77777777-7777-4777-8777-777777777777", status: "revoked", reviewed_by: "teacher@example.com" }]), { status: 200 });
        }
        if (requestUrl.includes("audit_log")) return new Response("[]", { status: 201 });
        throw new Error("Unexpected request: " + requestUrl);
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("PATCH", teacherToken, "test-walas-revoke-approved-absence");
    req.body = { id: requestId, status: "revoked" };
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.request.status, "revoked");
    assert.ok(calls.some(call => call.method === "PATCH" && call.url.includes("status=eq.approved")));
    assert.ok(calls.some(call => call.url.includes("audit_log")));
});

test("Walas cannot revoke an approved absence belonging to another homeroom", async t => {
    const originalFetch = globalThis.fetch;
    const teacherId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const requestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const teacherToken = signToken({ email: "teacher@example.com", name: "Teacher", role: "guru" });
    let patchAttempted = false;
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes("teachers?select=email,is_active")) return new Response(JSON.stringify([{ email: "teacher@example.com", is_active: true }]), { status: 200 });
        if (requestUrl.includes("teachers?select=id,name,email,homeroom_class&email=eq.teacher%40example.com")) return new Response(JSON.stringify([{ id: teacherId, name: "Teacher", email: "teacher@example.com", homeroom_class: "XI IPA 1" }]), { status: 200 });
        if (requestUrl.includes("absence_requests?id=eq." + requestId) && requestUrl.includes("students!inner(homeroom_teacher_id)")) return new Response("[]", { status: 200 });
        if (init.method === "PATCH") patchAttempted = true;
        throw new Error("Unexpected request: " + requestUrl);
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("PATCH", teacherToken, "test-walas-cross-homeroom-revoke-denied");
    req.body = { id: requestId, status: "revoked" };
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 404);
    assert.equal(patchAttempted, false, "out-of-scope request must never reach the update operation");
});
test("sick absence requires a verified medical file before submission and routes to Walas", async t => {
    const originalFetch = globalThis.fetch;
    const studentId = "33333333-3333-4333-8333-333333333333";
    const teacherId = "44444444-4444-4444-8444-444444444444";
    const requestId = "55555555-5555-4555-8555-555555555555";
    const filePath = studentId + "/" + requestId + "/66666666-6666-4666-8666-666666666666.pdf";
    const token = signToken({ email: "student@example.com", role: "siswa", nisn: "12345678" });
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("students?select=email,nisn,is_active")) {
            return new Response(JSON.stringify([{ email: "student@example.com", nisn: "12345678", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("students?select=id,nisn,name,class_name,parent_whatsapp,homeroom_teacher_id")) {
            return new Response(JSON.stringify([{ id: studentId, nisn: "12345678", name: "Student", class_name: "XI IPA 1", homeroom_teacher_id: teacherId, parent_whatsapp: null }]), { status: 200 });
        }
        if (requestUrl.includes("/storage/v1/object/info/medical-evidence/")) {
            return new Response(JSON.stringify({ size: 2048, mimetype: "application/pdf" }), { status: 200 });
        }
        if (requestUrl.includes("absence_requests?select=id,status")) return new Response("[]", { status: 200 });
        if (requestUrl.includes("absence_requests?select=id,student_id,absence_date,absence_type,severity,note,status,created_at,medical_evidence_path")) {
            assert.equal(init.method, "POST");
            const payload = JSON.parse(init.body);
            assert.equal(payload.status, "pending");
            assert.equal(payload.medical_evidence_path, filePath);
            assert.equal(Boolean(payload.medical_evidence_uploaded_at), true);
            return new Response(JSON.stringify([{ id: requestId, student_id: studentId, absence_date: "2026-11-02", absence_type: "sick", severity: "moderate", note: "Istirahat sesuai surat dokter", status: "pending", medical_evidence_path: filePath }]), { status: 201 });
        }
        if (requestUrl.includes("audit_log")) return new Response("[]", { status: 201 });
        if (requestUrl.includes("teacher_notifications?select=id&related_id=")) return new Response(JSON.stringify([{ id: "77777777-7777-4777-8777-777777777777" }]), { status: 200 });
        throw new Error("Unexpected request: " + requestUrl);
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("POST", token, "test-sick-evidence-before-submit");
    req.body = { date: "2026-11-02", type: "sick", severity: "moderate", note: "Istirahat sesuai surat dokter", evidence_request_id: requestId, medical_evidence_path: filePath };
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.request.status, "pending");
    assert.equal(res.body.teacher_notification.created, true);
    assert.equal(calls.some(call => call.url.includes("teacher_notifications?select=id&related_id=")), true);
});

test("sick absence is rejected when no medical evidence is attached", async t => {
    const originalFetch = globalThis.fetch;
    const token = signToken({ email: "student@example.com", role: "siswa", nisn: "12345678" });
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        if (requestUrl.includes("students?select=email,nisn,is_active")) return new Response(JSON.stringify([{ email: "student@example.com", nisn: "12345678", is_active: true }]), { status: 200 });
        if (requestUrl.includes("students?select=id,nisn,name,class_name,parent_whatsapp,homeroom_teacher_id")) return new Response(JSON.stringify([{ id: "33333333-3333-4333-8333-333333333333", nisn: "12345678", name: "Student", class_name: "XI IPA 1", homeroom_teacher_id: "44444444-4444-4444-8444-444444444444" }]), { status: 200 });
        throw new Error("Medical evidence must be rejected before storage or insertion");
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("POST", token, "test-sick-evidence-required");
    req.body = { date: "2026-11-02", type: "sick", severity: "moderate", note: "Istirahat" };
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /surat keterangan sakit wajib diunggah/i);
});
test("dispensation is rejected when the student has not recorded attendance today", async t => {
    const originalFetch = globalThis.fetch;
    const studentId = "33333333-3333-4333-8333-333333333333";
    const studentToken = signToken({
        email: "student@example.com", role: "siswa", nisn: "12345678"
    });
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const date = parts.find(part => part.type === "year").value + "-" +
        parts.find(part => part.type === "month").value + "-" +
        parts.find(part => part.type === "day").value;
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        if (requestUrl.includes("students?select=email,nisn,is_active")) {
            return new Response(JSON.stringify([{
                email: "student@example.com", nisn: "12345678", is_active: true
            }]), { status: 200 });
        }
        if (requestUrl.includes("students?select=id,nisn,name,class_name,parent_whatsapp,homeroom_teacher_id")) {
            return new Response(JSON.stringify([{
                id: studentId, nisn: "12345678", name: "Student", class_name: "XIA",
                homeroom_teacher_id: "44444444-4444-4444-8444-444444444444"
            }]), { status: 200 });
        }
        if (requestUrl.includes("attendance?select=id&student_id=eq.")) {
            return new Response("[]", { status: 200 });
        }
        throw new Error("Unexpected data query: " + requestUrl);
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("POST", studentToken, "test-dispensation-requires-attendance");
    req.body = {
        date, type: "dispensation", note: "Kegiatan sekolah",
        lat: -6.25359, lng: 106.60299, accuracy: 8, gpsTimestamp: Date.now()
    };
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /record your school attendance/i);
});

test("sick absence requests require a severity selection", async t => {
    const originalFetch = globalThis.fetch;
    const studentToken = signToken({
        email: "student@example.com", role: "siswa", nisn: "12345678"
    });
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        if (requestUrl.includes("students?select=email,nisn,is_active")) {
            return new Response(JSON.stringify([{
                email: "student@example.com", nisn: "12345678", is_active: true
            }]), { status: 200 });
        }
        throw new Error("Unexpected data query: " + requestUrl);
    };
    t.after(() => { globalThis.fetch = originalFetch; });
    const req = requestMock("POST", studentToken, "test-sick-severity-required");
    req.body = {
        date: "2026-11-03", type: "sick", note: "Sedang tidak sehat"
    };
    const res = responseMock();
    await absenceHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /severity/i);
});

test("one sign-in endpoint resolves Admin, Guru, and Siswa from their role tables", async t => {
    const originalFetch = globalThis.fetch;
    const password = "SecureExample!234";
    const passwordHash = await hashPassword(password);
    const passwordDigest = createHash("sha256").update(password).digest("hex");
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        requests.push({ url: requestUrl, method: init.method || "GET" });
        if (init.method === "PATCH") return new Response("[]", { status: 200 });

        if (requestUrl.includes("admin_users?select=")) {
            const rows = requestUrl.includes("admin%40example.com")
                ? [{ email: "admin@example.com", name: "Admin Test", password_hash: passwordHash, is_active: true }]
                : [];
            return new Response(JSON.stringify(rows), { status: 200 });
        }
        if (requestUrl.includes("teachers?select=")) {
            const rows = requestUrl.includes("guru%40example.com")
                ? [{ email: "guru@example.com", name: "Guru Test", password_hash: passwordHash, is_active: true }]
                : [];
            return new Response(JSON.stringify(rows), { status: 200 });
        }
        if (requestUrl.includes("students?select=email,name,nisn,password_hash,is_active")) {
            const rows = requestUrl.includes("siswa%40example.com")
                ? [{ email: "siswa@example.com", name: "Siswa Test", nisn: "12345678", password_hash: passwordHash, is_active: true }]
                : [];
            return new Response(JSON.stringify(rows), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    for (const account of [
        { email: "admin@example.com", role: "admin" },
        { email: "guru@example.com", role: "guru" },
        { email: "siswa@example.com", role: "siswa" }
    ]) {
        const captcha = createLoginCaptcha("id");
        const req = {
            method: "POST",
            headers: { origin: "https://school.example" },
            socket: { remoteAddress: `test-unified-login-${account.role}` },
            body: {
                email: account.email,
                password: passwordDigest,
                captchaToken: captcha.token,
                captchaAnswer: captcha.answer
            }
        };
        const res = responseMock();
        await authLoginHandler(req, res);
        assert.equal(res.statusCode, 200, `${account.role} login should succeed through the shared endpoint`);
        assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
        assert.equal(res.body.user.role, account.role);
        assert.equal(verifyToken(res.body.token)?.role, account.role);
    }

    assert.ok(requests.some(request => request.url.includes("admin_users?select=")));
    assert.ok(requests.some(request => request.url.includes("teachers?select=")));
    assert.ok(requests.some(request => request.url.includes("students?select=email,name,nisn,password_hash,is_active")));
    assert.ok(requests.filter(request => request.method === "PATCH").length >= 3);
});


test("teacher roster never receives biometric descriptors, even with the legacy query flag", async t => {
    const originalFetch = globalThis.fetch;
    const teacherToken = signToken({ email: "teacher@example.com", role: "guru" });
    const requests = [];
    globalThis.fetch = async url => {
        const requestUrl = String(url);
        requests.push(requestUrl);
        if (requestUrl.includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([{ email: "teacher@example.com", is_active: true }]), { status: 200 });
        }
        if (requestUrl.includes("teachers?select=id&email=eq.teacher%40example.com")) {
            return new Response(JSON.stringify([{ id: "33333333-3333-4333-8333-333333333333" }]), { status: 200 });
        }
        if (requestUrl.includes("students?select=id,nisn,name,class_name,parent_whatsapp,created_at")) {
            return new Response(JSON.stringify([{
                id: "123e4567-e89b-42d3-a456-426614174000",
                nisn: "12345678",
                name: "Student",
                class_name: "XI IPA 1",
                parent_whatsapp: null,
                homeroom_teacher_id: "33333333-3333-4333-8333-333333333333",
                homeroom_teacher: { name: "Teacher", email: "teacher@example.com" },
                created_at: "2026-11-02T00:00:00Z"
            }]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = requestMock("GET", teacherToken, "test-no-face-descriptor-export");
    req.query = { with_faces: "1" };
    const res = responseMock();
    await studentsHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.students[0].face_descriptors, undefined);
    assert.ok(requests.some(url => url.includes("students?select=id,nisn,name,class_name,parent_whatsapp,created_at")));
    assert.ok(requests.every(url => !url.includes("face_descriptors")));
});

test("student permanent-delete endpoint is disabled", async () => {
    const req = requestMock("DELETE", null, "test-student-delete-disabled");
    req.query = { all: "1" };
    const res = responseMock();
    await studentsHandler(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Admin account deactivation/);
});

test("teachers cannot modify school geofence settings through the legacy settings endpoint", async () => {
    const teacherToken = signToken({ email: "teacher@example.com", role: "guru" });
    const req = requestMock("PUT", teacherToken, "test-teacher-geofence-denied");
    req.body = { lat: -6.2, lng: 106.6, radius: 500 };
    req.query = {};
    const res = responseMock();
    await settingsHandler(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Administrator role/);
});


test("Fonnte test status does not require a test-recipient allowlist", async t => {
    const originalFetch = globalThis.fetch;
    const previousToken = process.env.FONNTE_TOKEN;
    const previousAllowlist = process.env.FONNTE_TEST_RECIPIENTS;
    delete process.env.FONNTE_TOKEN;
    delete process.env.FONNTE_TEST_RECIPIENTS;
    const adminToken = signToken({ email: "admin@example.com", role: "admin" });
    globalThis.fetch = async url => {
        if (String(url).includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: "Admin", is_active: true }
            ]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => {
        globalThis.fetch = originalFetch;
        if (previousToken === undefined) delete process.env.FONNTE_TOKEN;
        else process.env.FONNTE_TOKEN = previousToken;
        if (previousAllowlist === undefined) delete process.env.FONNTE_TEST_RECIPIENTS;
        else process.env.FONNTE_TEST_RECIPIENTS = previousAllowlist;
    });

    const req = {
        method: "GET",
        query: { action: "test-tools" },
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: "test-fonnte-get-without-allowlist" }
    };
    const res = responseMock();
    await adminSettingsHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fonnte_configured, false);
    assert.equal(res.body.test_send_enabled, true);
    assert.equal(res.body.recipient_allowlist_required, false);
});

test("Fonnte test accepts a valid number after explicit consent and reports empty token", async t => {
    const originalFetch = globalThis.fetch;
    const previousToken = process.env.FONNTE_TOKEN;
    const previousAllowlist = process.env.FONNTE_TEST_RECIPIENTS;
    delete process.env.FONNTE_TOKEN;
    delete process.env.FONNTE_TEST_RECIPIENTS;
    const adminToken = signToken({ email: "admin@example.com", role: "admin" });
    const providerCalls = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: "Admin", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl === "https://api.fonnte.com/send") {
            providerCalls.push({ init, target: init.body?.get("target") });
            return new Response(JSON.stringify({ status: true }), { status: 200 });
        }
        if (requestUrl.includes("audit_log")) return new Response("[]", { status: 201 });
        return new Response("[]", { status: 200 });
    };
    t.after(() => {
        globalThis.fetch = originalFetch;
        if (previousToken === undefined) delete process.env.FONNTE_TOKEN;
        else process.env.FONNTE_TOKEN = previousToken;
        if (previousAllowlist === undefined) delete process.env.FONNTE_TEST_RECIPIENTS;
        else process.env.FONNTE_TEST_RECIPIENTS = previousAllowlist;
    });

    const request = (ip, body) => ({
        method: "POST",
        query: { action: "test-tools" },
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: ip },
        body
    });
    const missingTokenResponse = responseMock();
    await adminSettingsHandler(request("test-fonnte-token-empty", {
        target: "081234567890",
        message: "Amanah ID: pesan uji pengiriman.",
        confirm: true
    }), missingTokenResponse);
    assert.equal(missingTokenResponse.statusCode, 503);
    assert.equal(missingTokenResponse.body.code, "FONNTE_TOKEN_MISSING");
    assert.equal(providerCalls.length, 0);

    process.env.FONNTE_TOKEN = "  fonnte-test-token  ";
    const sentResponse = responseMock();
    await adminSettingsHandler(request("test-fonnte-send-no-allowlist", {
        target: "081234567890",
        message: "Amanah ID: pesan uji pengiriman.",
        confirm: true
    }), sentResponse);
    assert.equal(sentResponse.statusCode, 200);
    assert.equal(sentResponse.body.accepted, true);
    assert.equal(providerCalls.length, 1);
    assert.equal(providerCalls[0].target, "6281234567890");
    assert.equal(providerCalls[0].init.headers.Authorization, "fonnte-test-token");
});

test("Admin can reactivate a teacher through the audited account-control API", async t => {
    const originalFetch = globalThis.fetch;
    const adminToken = signToken({ email: "admin@example.com", role: "admin" });
    const teacherId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: "Admin", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("teachers?id=eq." + teacherId) && init.method === "PATCH") {
            return new Response(JSON.stringify([
                { id: teacherId, email: "teacher@example.com", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("audit_log")) return new Response("[]", { status: 201 });
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = {
        method: "PUT",
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: "test-admin-reactivate-teacher" },
        body: { action: "set_active", id: teacherId, table: "teachers", is_active: true }
    };
    const res = responseMock();
    await adminUsersHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.is_active, true);
    const patch = calls.find(call => call.method === "PATCH" && call.url.includes("teachers?id="));
    assert.ok(patch);
    assert.deepEqual(JSON.parse(patch.body), { is_active: true });
    assert.ok(calls.some(call => call.url.includes("audit_log")));
});

test("permanent student deletion is refused when attendance history exists", async t => {
    const originalFetch = globalThis.fetch;
    const adminToken = signToken({ email: "admin@example.com", role: "admin" });
    const studentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, method: init.method || "GET" });
        if (requestUrl.includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: "Admin", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("students?select=id,email,name&id=eq." + studentId)) {
            return new Response(JSON.stringify([
                { id: studentId, email: "student@example.com", name: "Student" }
            ]), { status: 200 });
        }
        if (requestUrl.includes("attendance?select=id&student_id=eq." + studentId)) {
            return new Response(JSON.stringify([{ id: "attendance-record" }]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = {
        method: "POST",
        query: { action: "permanent-delete" },
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: "test-admin-safe-permanent-delete" },
        body: { id: studentId, table: "students", confirm_email: "student@example.com" }
    };
    const res = responseMock();
    await adminUsersHandler(req, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /riwayat presensi/i);
    assert.equal(calls.some(call => call.method === "DELETE"), false);
});

test("a teacher can deactivate only a student assigned to that teacher's homeroom", async t => {
    const originalFetch = globalThis.fetch;
    const teacherToken = signToken({ email: "teacher@example.com", role: "guru" });
    const teacherId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const studentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("teachers?select=email,is_active")) {
            return new Response(JSON.stringify([
                { email: "teacher@example.com", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("system_settings?id=eq.00000000-0000-0000-0000-000000000002")) {
            return new Response("[]", { status: 200 });
        }
        if (requestUrl.includes("teachers?select=id,email&email=eq.teacher%40example.com")) {
            return new Response(JSON.stringify([{ id: teacherId, email: "teacher@example.com" }]), { status: 200 });
        }
        if (requestUrl.includes("students?select=id,nisn,email,is_active,homeroom_teacher_id")) {
            return new Response(JSON.stringify([{
                id: studentId, nisn: "12345678", email: "student@example.com",
                is_active: true, homeroom_teacher_id: teacherId
            }]), { status: 200 });
        }
        if (requestUrl.includes("students?id=eq." + studentId) && init.method === "PATCH") {
            return new Response(JSON.stringify([{
                id: studentId, nisn: "12345678", email: "student@example.com", is_active: false
            }]), { status: 200 });
        }
        if (requestUrl.includes("audit_log")) return new Response("[]", { status: 201 });
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = requestMock("PATCH", teacherToken, "test-teacher-deactivate-homeroom");
    req.body = { action: "deactivate", nisn: "12345678" };
    const res = responseMock();
    await studentsHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.is_active, false);
    const studentPatch = calls.find(call => call.method === "PATCH" && call.url.includes("students?id="));
    assert.ok(studentPatch);
    assert.deepEqual(JSON.parse(studentPatch.body), { is_active: false });
    assert.ok(calls.some(call => call.url.includes("audit_log")));
});

test("offline attendance upload remains pending and never inserts official attendance", async t => {
    const originalFetch = globalThis.fetch;
    const studentToken = signToken({ email: "student@example.com", role: "siswa", nisn: "12345678" });
    const studentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const eventId = "00000000-0000-4000-8000-000000000001";
    const calls = [];
    const now = Date.now();
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("students?select=email,nisn,is_active&email=eq.student%40example.com")) {
            return new Response(JSON.stringify([
                { email: "student@example.com", nisn: "12345678", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("system_settings?id=eq.00000000-0000-0000-0000-000000000002")) {
            return new Response("[]", { status: 200 });
        }
        if (requestUrl.includes("students?select=id,nisn,name,class_name,is_active&is_active=eq.true")) {
            return new Response(JSON.stringify([{
                id: studentId, nisn: "12345678", name: "Student", class_name: "XI IPA 1", is_active: true
            }]), { status: 200 });
        }
        if (requestUrl.includes("offline_attendance_events?select=id,event_id,status,student_id")) {
            return new Response("[]", { status: 200 });
        }
        if (requestUrl.includes("school_settings?select=lat,lng,radius")) {
            return new Response(JSON.stringify([{
                lat: -6.253590517740096, lng: 106.60299502682263, radius: 50
            }]), { status: 200 });
        }
        if (requestUrl.includes("attendance?select=id&student_id=")) return new Response("[]", { status: 200 });
        if (requestUrl.includes("offline_attendance_events?select=id,event_id&student_id=")) return new Response("[]", { status: 200 });
        if (requestUrl.includes("offline_attendance_events?select=id,event_id,status,claimed_at,received_at") && init.method === "POST") {
            const body = JSON.parse(init.body);
            assert.equal(body.status, "pending_review");
            assert.equal(body.face_liveness_completed, true);
            assert.equal(body.school_date, new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }));
            return new Response(JSON.stringify([{
                id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
                event_id: eventId,
                status: "pending_review",
                claimed_at: body.claimed_at,
                received_at: new Date().toISOString()
            }]), { status: 201 });
        }
        if (requestUrl.includes("audit_log")) return new Response("[]", { status: 201 });
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = requestMock("POST", studentToken, "test-offline-attendance-pending-only");
    req.body = {
        action: "offline-pending",
        event_id: eventId,
        claimed_at: now,
        lat: -6.253590517740096,
        lng: 106.60299502682263,
        accuracy: 5,
        gps_timestamp: now,
        speed: 0,
        face_liveness_completed: true,
        face_model_key: "auraface-glintr100-int8-v1"
    };
    const res = responseMock();
    await attendanceHandler(req, res);
    assert.equal(res.statusCode, 202);
    assert.equal(res.body.official_attendance, false);
    assert.equal(res.body.status, "pending_review");
    assert.equal(calls.some(call => call.method === "POST" && call.url.includes("/attendance?")), false);
});

test("Admin offline review delegates official attendance and audit to one atomic RPC", async t => {
    const originalFetch = globalThis.fetch;
    const adminToken = signToken({ email: "admin@example.com", role: "admin" });
    const eventId = "00000000-0000-4000-8000-000000000002";
    const eventRowId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        const requestUrl = String(url);
        calls.push({ url: requestUrl, method: init.method || "GET", body: init.body });
        if (requestUrl.includes("admin_users?select=email,name,is_active")) {
            return new Response(JSON.stringify([
                { email: "admin@example.com", name: "Admin", is_active: true }
            ]), { status: 200 });
        }
        if (requestUrl.includes("offline_attendance_events?select=id,event_id,student_id,claimed_at,school_date,status")) {
            return new Response(JSON.stringify([{
                id: eventRowId, event_id: eventId, student_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                claimed_at: new Date().toISOString(), school_date: "2026-11-05", status: "pending_review",
                student: {
                    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", nisn: "12345678", name: "Student",
                    class_name: "XI IPA 1", is_active: true, homeroom_teacher_id: null, parent_whatsapp: null
                }
            }]), { status: 200 });
        }
        if (requestUrl.endsWith("/rpc/review_offline_attendance_event")) {
            const body = JSON.parse(init.body);
            assert.equal(body.p_actor_role, "admin");
            assert.equal(body.p_decision, "approve");
            assert.equal(body.p_teacher_id, null);
            return new Response(JSON.stringify({
                event_id: eventId, status: "approved", official_attendance: true,
                attendance_id: "11111111-1111-4111-8111-111111111111",
                student_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                nisn: "12345678", name: "Student", class_name: "XI IPA 1",
                parent_whatsapp: null, attendance_date: "2026-11-05", attendance_time: "07:30:00"
            }), { status: 200 });
        }
        return new Response("[]", { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const req = {
        method: "POST",
        headers: { origin: "https://school.example", "x-admin-token": adminToken },
        socket: { remoteAddress: "test-admin-offline-atomic-review" },
        body: { action: "offline-review", id: eventRowId, decision: "approve", notes: "Siswa dikonfirmasi hadir oleh wali kelas." }
    };
    const res = responseMock();
    await attendanceHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.official_attendance, true);
    assert.equal(res.body.status, "approved");
    assert.equal(res.body.audit_recorded, true);
    assert.equal(calls.filter(call => call.url.endsWith("/rpc/review_offline_attendance_event")).length, 1);
    assert.equal(calls.some(call => call.method === "POST" && call.url.includes("/attendance?")), false);
});
