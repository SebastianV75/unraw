import { describe, expect, it } from "vitest";
import {
	CAPTURE_DRAFT_VERSION,
	hashCaptureNote,
	readCaptureDraft,
} from "@/lib/captures/draft";

describe("capture drafts", () => {
	it("uses a wider deterministic digest for note binding", () => {
		const digest = hashCaptureNote("nota");
		expect(digest).toHaveLength(32);
		expect(hashCaptureNote("nota")).toBe(digest);
		expect(hashCaptureNote("nota distinta")).not.toBe(digest);
	});
	it("recovers a versioned draft", () => {
		const draft = {
			version: CAPTURE_DRAFT_VERSION,
			rawNote: "nota completa",
			idempotencyKey: "00000000-0000-0000-0000-000000000001",
			processedNoteHash: "note-hash",
			result: null,
			approved: {},
			assignedAreas: {},
			assignedProjects: {},
			rejectedItems: {},
			editedValues: {},
			projectAreas: {},
		};

		expect(readCaptureDraft(JSON.stringify(draft))).toEqual(draft);
		expect(JSON.stringify(draft)).not.toContain("undoToken");
		expect(
			readCaptureDraft(JSON.stringify({ ...draft, version: 2 })),
		).toMatchObject({
			rawNote: JSON.stringify({ ...draft, version: 2 }),
			idempotencyKey: "",
		});
	});
	it("defaults assigned projects for an older v1 draft", () => {
		const legacyDraft = {
			version: CAPTURE_DRAFT_VERSION,
			rawNote: "nota",
			idempotencyKey: "",
			result: null,
			approved: {},
			assignedAreas: {},
			rejectedItems: {},
			editedValues: {},
			projectAreas: {},
		};
		expect(readCaptureDraft(JSON.stringify(legacyDraft))).not.toHaveProperty(
			"assignedProjects",
		);
	});

	it("migrates the legacy raw-text draft to CaptureDraft v1", () => {
		expect(readCaptureDraft("  nota legacy\ncompleta  ")).toEqual({
			version: CAPTURE_DRAFT_VERSION,
			rawNote: "  nota legacy\ncompleta  ",
			idempotencyKey: "",
			result: null,
			approved: {},
			assignedAreas: {},
			assignedProjects: {},
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
