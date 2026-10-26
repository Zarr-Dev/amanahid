export function validateSchema(schema, data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return { valid: false, error: "Request body must be an object" };
    }
    const allowed = new Set(Object.keys(schema));
    const unknown = Object.keys(data).find(key => !allowed.has(key));
    if (unknown) return { valid: false, error: `Unknown field: ${unknown}` };

    for (const [key, rule] of Object.entries(schema)) {
        const value = data[key];
        if (value === undefined && !rule.required) continue;
        if (value === undefined || value === null) {
            return { valid: false, error: `${key} is required` };
        }
        if (rule.type === "string") {
            if (typeof value !== "string" || value.length > rule.max ||
                (rule.min !== undefined && value.length < rule.min) ||
                (rule.pattern && !rule.pattern.test(value))) {
                return { valid: false, error: `Invalid ${key}` };
            }
        } else if (rule.type === "number") {
            if (typeof value !== "number" || !Number.isFinite(value) ||
                (rule.min !== undefined && value < rule.min) ||
                (rule.max !== undefined && value > rule.max)) {
                return { valid: false, error: `Invalid ${key}` };
            }
        } else if (rule.type === "array") {
            if (!Array.isArray(value) || value.length < rule.min || value.length > rule.max ||
                !value.every(rule.validate)) return { valid: false, error: `Invalid ${key}` };
        } else if (rule.type === "boolean" && typeof value !== "boolean") {
            return { valid: false, error: `Invalid ${key}` };
        }
    }
    return { valid: true };
}
