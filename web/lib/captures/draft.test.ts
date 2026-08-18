import { describe, expect, it } from "vitest";
import {
	CAPTURE_DRAFT_VERSION,
	readCaptureDraft,
} from "@/lib/captures/draft";

describe("capture drafts", () => {
	it("recovers a versioned draft", () => {
		const draft = {
			version: CAPTURE_DRAFT_VERSION,
			rawNote: "nota completa",
			idempotencyKey: "00000000-0000-0000-0000-000000000001",
			result: null,
			approved: {},
			assignedAreas: {},
			rejectedItems: {},
			editedValues: {},
			projectAreas: {},
		};

		expect(readCaptureDraft(JSON.stringify(draft))).toEqual(draft);
		expect(readCaptureDraft(JSON.stringify({ ...draft, version: 2 }))).toMatchObject({
			rawNote: JSON.stringify({ ...draft, version: 2 }),
			idempotencyKey: "",
		});
	});

	it("migrates the legacy raw-text draft to CaptureDraft v1", () => {
		expect(readCaptureDraft("  nota legacy\ncompleta  ")).toEqual({
			version: CAPTURE_DRAFT_VERSION,
			rawNote: "  nota legacy\ncompleta  ",
			idempotencyKey: "",
			result: null,
			approved: {},
			assignedAreas: {},
			rejectedItems: {},
			editedValues: {},
			projectAreas: {},
		});
		expect(readCaptureDraft("{ raw legacy note")).toMatchObject({
			version: CAPTURE_DRAFT_VERSION,
			rawNote: "{ raw legacy note",
			idempotencyKey: "",
		});

		const jsonNote = '{"idea":"conservar"}';
		expect(readCaptureDraft(jsonNote)).toMatchObject({
			version: CAPTURE_DRAFT_VERSION,
			rawNote: jsonNote,
		});
	});
});
