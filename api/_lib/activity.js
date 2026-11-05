const LOGIN_ACTIONS = new Set(["admin.login", "auth.login"]);

export function lastActivityByEmail(users, entries) {
    const latestByEmail = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
        if (!entry || typeof entry !== "object") continue;
        const email = typeof entry.actor_email === "string" ? entry.actor_email.trim().toLowerCase() : "";
        const action = typeof entry.action === "string" ? entry.action : "";
        const createdAt = typeof entry.created_at === "string" ? entry.created_at : "";
        const timestamp = Date.parse(createdAt);
        if (!email || !action || LOGIN_ACTIONS.has(action.toLowerCase()) ||
            /(^|\.)(login|logout)$/i.test(action) || !Number.isFinite(timestamp)) continue;

        const previous = latestByEmail.get(email);
        if (!previous || timestamp > previous.timestamp) {
            latestByEmail.set(email, { action, created_at: createdAt, timestamp });
        }
    }

    return (Array.isArray(users) ? users : []).map(user => {
        const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
        const activity = latestByEmail.get(email);
        return {
            id: user?.id ?? null,
            name: user?.name ?? "",
            email: user?.email ?? "",
            is_active: user?.is_active === true,
            last_login_at: user?.last_login_at ?? null,
            last_activity_at: activity?.created_at ?? null,
            last_activity_action: activity?.action ?? null
        };
    });
}
