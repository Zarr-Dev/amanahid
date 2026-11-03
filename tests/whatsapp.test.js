import assert from "node:assert/strict";
import test from "node:test";
import { sendWhatsApp } from "../api/_lib/whatsapp.js";

test("Fonnte accepts offline-device messages into its queue without claiming delivery", async t => {
    const previousToken = process.env.FONNTE_TOKEN;
    const originalFetch = globalThis.fetch;
    process.env.FONNTE_TOKEN = "test-fonnte-token";
    let submittedForm;
    globalThis.fetch = async (url, init = {}) => {
        assert.equal(url, "https://api.fonnte.com/send");
        assert.equal(init.method, "POST");
        assert.equal(init.headers.Authorization, "test-fonnte-token");
        assert.ok(init.body instanceof FormData);
        submittedForm = init.body;
        return new Response(JSON.stringify({
            status: true,
            process: "pending",
            requestid: 12345,
            id: ["80367170"]
        }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    t.after(() => {
        if (previousToken === undefined) delete process.env.FONNTE_TOKEN;
        else process.env.FONNTE_TOKEN = previousToken;
        globalThis.fetch = originalFetch;
    });

    const result = await sendWhatsApp("6281234567890", "Amanah ID: pengajuan sakit telah diterima.");
    assert.equal(submittedForm.get("target"), "6281234567890");
    assert.equal(submittedForm.get("message"), "Amanah ID: pengajuan sakit telah diterima.");
    assert.equal(submittedForm.get("connectOnly"), "false");
    assert.equal(result.status, true);
    assert.equal(result.process, "pending");
    assert.equal(result.requestid, 12345);
});

test("Fonnte rejected queue requests are surfaced as provider errors", async t => {
    const previousToken = process.env.FONNTE_TOKEN;
    const originalFetch = globalThis.fetch;
    process.env.FONNTE_TOKEN = "test-fonnte-token";
    globalThis.fetch = async () => new Response(JSON.stringify({
        status: false,
        reason: "device disconnected",
        requestid: 12346
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    t.after(() => {
        if (previousToken === undefined) delete process.env.FONNTE_TOKEN;
        else process.env.FONNTE_TOKEN = previousToken;
        globalThis.fetch = originalFetch;
    });

    await assert.rejects(
        () => sendWhatsApp("6281234567890", "Amanah ID: pengajuan izin telah diterima."),
        error => error.code === "FONNTE_REJECTED"
    );
});

test("Fonnte recipient and message validation runs before network requests", async t => {
    const previousToken = process.env.FONNTE_TOKEN;
    const originalFetch = globalThis.fetch;
    process.env.FONNTE_TOKEN = "test-fonnte-token";
    globalThis.fetch = async () => { throw new Error("Network should not be called for invalid input"); };
    t.after(() => {
        if (previousToken === undefined) delete process.env.FONNTE_TOKEN;
        else process.env.FONNTE_TOKEN = previousToken;
        globalThis.fetch = originalFetch;
    });
    await assert.rejects(() => sendWhatsApp("081234567890", "Valid enough message."), /Invalid WhatsApp recipient/);
    await assert.rejects(() => sendWhatsApp("6281234567890", "tiny"), /Invalid WhatsApp message/);
});
