import assert from "node:assert/strict";
import test from "node:test";
import { lastActivityByEmail } from "../api/_lib/activity.js";

test("role activity is mapped to account email and the newest meaningful action", () => {
    const users = [
        { id: "a1", name: "Admin A", email: "ADMIN@example.test", is_active: true, last_login_at: "2026-11-04T08:00:00Z" },
        { id: "t1", name: "Guru T", email: "teacher@example.test", is_active: true, last_login_at: null },
        { id: "s1", name: "Siswa S", email: "student@example.test", is_active: false, last_login_at: "2026-11-02T08:00:00Z" }
    ];
    const entries = [
        { actor_email: "admin@example.test", action: "settings.update", created_at: "2026-11-04T09:00:00Z" },
        { actor_email: "ADMIN@example.test", action: "admin.login", created_at: "2026-11-04T10:00:00Z" },
        { actor_email: "teacher@example.test", action: "student.face_update_v2", created_at: "2026-11-03T08:00:00Z" },
        { actor_email: "student@example.test", action: "attendance.create", created_at: "2026-11-02T09:00:00Z" },
        { actor_email: "student@example.test", action: "attendance.create", created_at: "2026-11-02T08:30:00Z" }
    ];
    const result = lastActivityByEmail(users, entries);
    assert.equal(result[0].last_activity_action, "settings.update");
    assert.equal(result[0].last_activity_at, "2026-11-04T09:00:00Z");
    assert.equal(result[1].last_activity_action, "student.face_update_v2");
    assert.equal(result[1].last_activity_at, "2026-11-03T08:00:00Z");
    assert.equal(result[2].last_activity_action, "attendance.create");
    assert.equal(result[2].last_activity_at, "2026-11-02T09:00:00Z");
    assert.equal(result[2].is_active, false);
});

test("login/logout audit events are not counted as last non-login activity", () => {
    const result = lastActivityByEmail(
        [{ id: "a1", email: "admin@example.test", last_login_at: "2026-11-04T10:00:00Z" }],
        [
            { actor_email: "admin@example.test", action: "admin.login", created_at: "2026-11-04T10:00:00Z" },
            { actor_email: "admin@example.test", action: "auth.logout", created_at: "2026-11-04T10:05:00Z" }
        ]
    );
    assert.equal(result[0].last_activity_at, null);
    assert.equal(result[0].last_activity_action, null);
});

test("invalid audit timestamps and unknown users are safely ignored", () => {
    const result = lastActivityByEmail(
        [{ id: "x", email: "x@example.test", last_login_at: null }],
        [
            { actor_email: "x@example.test", action: "attendance.create", created_at: "invalid" },
            { actor_email: "unknown@example.test", action: "attendance.create", created_at: "2026-11-04T10:00:00Z" }
        ]
    );
    assert.equal(result[0].last_activity_at, null);
});
