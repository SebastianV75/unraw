import { describe, expect, it } from "vitest";
import { getCaptureReviewState } from "@/lib/captures/review-state";

const baseTask = {
	title: "Tarea",
	due_date: null,
	due_at: null,
	area_id: null,
	project_id: null,
	suggested_new_area: null,
	suggested_new_project: null,
};

describe("capture review state", () => {
	it("allows the originally empty fallback state", () => {
		const state = getCaptureReviewState(
			{ tasks: [], ideas: [], second_brain: [], suggestions: [] },
			{},
			0,
		);
		expect(state).toMatchObject({
			originallyEmpty: true,
			emptyAfterManualDiscard: false,
		});
	});

	it("blocks the state created by manually discarding the only result", () => {
		const state = getCaptureReviewState(
			{ tasks: [baseTask], ideas: [], second_brain: [], suggestions: [] },
			{ "task:0": true },
			0,
		);
		expect(state).toMatchObject({
			originallyEmpty: false,
			emptyAfterManualDiscard: true,
		});
	});
});
