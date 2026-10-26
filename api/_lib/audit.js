import { supabaseRequest } from "./supabase.js";

export async function writeAuditLog(actor, action, targetTable, targetId, metadata = {}) {
    if (!actor?.email || !actor?.role) throw new Error("Audit actor is missing");
    await supabaseRequest("audit_log", {
        method: "POST",
        body: JSON.stringify({
            actor_email: actor.email,
            actor_role: actor.role,
            action,
            target_table: targetTable || null,
            target_id: targetId ? String(targetId) : null,
            metadata
        })
    });
}
