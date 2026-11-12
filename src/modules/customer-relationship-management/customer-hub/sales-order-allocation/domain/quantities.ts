/** Fixed six-decimal quantities. Never round stock or demand silently. */
const SCALE = 1_000_000n;

export function quantity(value: string | number): bigint {
    const text = String(value);
    if (!/^\d{1,24}(?:\.\d{1,6})?$/.test(text)) throw new Error("Quantity must be non-negative with at most six decimal places");
    const [whole, fraction = ""] = text.split(".");
    return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
}

export function quantityText(value: bigint): string {
    if (value < 0n) throw new Error("Negative quantity");
    const whole = value / SCALE;
    const fraction = (value % SCALE).toString().padStart(6, "0").replace(/0+$/, "");
    return `${whole}${fraction ? `.${fraction}` : ""}`;
}

export function submissionMicros(value: string): bigint {
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/.exec(value);
    if (!match) throw new Error("A canonical UTC submission timestamp is required");
    const milliseconds = Date.parse(`${match[1]}Z`);
    if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 19) !== match[1]) throw new Error("Invalid submission timestamp");
    return BigInt(milliseconds) * 1_000n + BigInt((match[2] || "").padEnd(6, "0"));
}
