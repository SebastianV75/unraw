import { describe, expect, it } from "vitest";
import { resolveIdempotencyKey } from "@/lib/captures/idempotency";

describe("capture idempotency keys", () => {
	it("keeps a key for the same raw note and rotates it after a change", () => {
		const current = "00000000-0000-0000-0000-000000000001";
		expect(resolveIdempotencyKey(current, "nota", "nota")).toBe(current);
		expect(
			resolveIdempotencyKey(current, "nota", "nota editada", () => "rotated"),
		).toBe("rotated");
	});
});
