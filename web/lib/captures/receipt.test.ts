import { describe, expect, it } from "vitest";
import { parseSaveCaptureResult } from "@/lib/captures/receipt";

describe("capture save receipts", () => {
	it("accepts the durable receipt shape", () => {
		expect(
			parseSaveCaptureResult({
				batch_id: "batch-1",
				affected_area_ids: [],
				inbox_item_ids: ["inbox-1"],
				existing: false,
			}),
		).toMatchObject({ inbox_item_ids: ["inbox-1"], existing: false });
	});

	it("rejects a 200 response that is not a receipt", () => {
		expect(() => parseSaveCaptureResult({ ok: true })).toThrow(
			"recibo de guardado válido",
		);
	});
});
