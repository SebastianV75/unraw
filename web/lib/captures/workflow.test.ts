import { describe, expect, it } from "vitest";
import type { CaptureOutput } from "@/types";
import {
	canSaveCapture,
	captureWorkflowReducer,
	getCaptureShortcutAction,
	initialCaptureWorkflowState,
} from "@/lib/captures/workflow";
import {
	captureReviewReducer,
	initialCaptureReviewState,
	type CaptureReviewState,
} from "@/lib/captures/review-state";

const result = { tasks: [], ideas: [], second_brain: [], suggestions: [] };
const reviewResult = {
tasks: [{ title: "Tarea" }],
ideas: [],
second_brain: [],
suggestions: [],
} as CaptureOutput;

describe("capture workflow reducer", () => {
	it("moves through processing and reviewing without mixed pending states", () => {
		const processing = captureWorkflowReducer(initialCaptureWorkflowState, {
			type: "PROCESS_STARTED",
		});
		expect(processing).toMatchObject({
			phase: "processing",
			result: null,
		});

		const reviewing = captureWorkflowReducer(processing, {
			type: "PROCESS_SUCCEEDED",
			result,
		});
		expect(reviewing).toMatchObject({ phase: "reviewing", result });
	});

	it("returns to review after a failed save and preserves the result", () => {
		const reviewing = {
			...initialCaptureWorkflowState,
			phase: "reviewing" as const,
			result,
		};
		const saving = captureWorkflowReducer(reviewing, { type: "SAVE_STARTED" });
		const failed = captureWorkflowReducer(saving, {
			type: "SAVE_FAILED",
			message: "Falló",
		});
		expect(failed).toMatchObject({
			phase: "reviewing",
			result,
			error: "Falló",
		});
	});

	it("returns to review after processing fails with a previous result", () => {
		const reviewing = {
			...initialCaptureWorkflowState,
			phase: "reviewing" as const,
			result,
		};
		const processing = captureWorkflowReducer(reviewing, { type: "PROCESS_STARTED" });
		const failed = captureWorkflowReducer(processing, {
			type: "PROCESS_FAILED",
			message: "Falló el reproceso",
		});
		expect(failed).toMatchObject({ phase: "reviewing", result, error: "Falló el reproceso" });
	});

	it("stays editing after processing fails without a previous result", () => {
		const failed = captureWorkflowReducer(
			{ ...initialCaptureWorkflowState, phase: "processing" },
			{ type: "PROCESS_FAILED", message: "Falló" },
		);
		expect(failed).toMatchObject({ phase: "editing", result: null });
	});

	it("keeps review and workflow snapshots aligned across a failed reprocess", () => {
		const reviewBefore = {
			...({
				...captureReviewReducer(
					{ ...initialCaptureReviewState, result: reviewResult } as CaptureReviewState,
					{ type: "begin-edit", key: "task:0", value: "Editada" },
				),
				assignedAreas: { "task:0": "area" },
				rejectedItems: { "task:0": true },
				undoToken: { key: "task:0", previous: { present: false, value: undefined } },
			} satisfies CaptureReviewState),
		};
		const reviewAfter = captureReviewReducer(reviewBefore, { type: "processing-started" });
		const workflowAfter = captureWorkflowReducer(
			captureWorkflowReducer(
				{ ...initialCaptureWorkflowState, phase: "reviewing", result: reviewResult },
				{ type: "PROCESS_STARTED" },
			),
			{ type: "PROCESS_FAILED", message: "Falló" },
		);
		expect(reviewAfter).toEqual(reviewBefore);
		expect(workflowAfter).toMatchObject({ phase: "reviewing", result: reviewResult });
	});

	it("clears the result after a successful save", () => {
		const saved = captureWorkflowReducer(
			{ ...initialCaptureWorkflowState, phase: "saving", result },
			{ type: "SAVE_SUCCEEDED", message: "Guardada" },
		);
		expect(saved).toEqual({
			phase: "success",
			result: null,
			error: "",
			saveError: "",
			success: "Guardada",
		});
	});

	it("hydrates a draft result into reviewing regardless of context effect order", () => {
		const hydrated = captureWorkflowReducer(initialCaptureWorkflowState, {
			type: "HYDRATE_RESULT",
			result,
		});
		expect(hydrated).toMatchObject({ phase: "reviewing", result });

		const contextFirst = captureWorkflowReducer(
			captureWorkflowReducer(initialCaptureWorkflowState, {
				type: "CONTEXT_READY",
			}),
			{ type: "HYDRATE_RESULT", result },
		);
		expect(contextFirst).toMatchObject({ phase: "reviewing", result });
	});

	it("does not let late context responses overwrite active workflow phases", () => {
		for (const phase of ["processing", "saving", "success"] as const) {
			const state = { ...initialCaptureWorkflowState, phase, result };
			expect(captureWorkflowReducer(state, { type: "CONTEXT_READY" })).toEqual(
				state,
			);
			expect(
				captureWorkflowReducer(state, {
					type: "CONTEXT_FAILED",
					message: "Context failed",
				}),
			).toEqual(state);
		}
	});

	it("keeps workflow result synchronized when review changes", () => {
		const changed = {
			...result,
			tasks: [{ ...result.tasks[0], title: "Editada" }],
		};
		const state = captureWorkflowReducer(
			{ ...initialCaptureWorkflowState, phase: "reviewing", result },
			{ type: "RESULT_CHANGED", result: changed },
		);
		expect(state).toMatchObject({ phase: "reviewing", result: changed });
	});

	it("starts a new editing flow when the note changes after success", () => {
		const editing = captureWorkflowReducer(
			{
				...initialCaptureWorkflowState,
				phase: "success",
				success: "Guardada",
			},
			{ type: "NOTE_CHANGED" },
		);
		expect(editing).toMatchObject({ phase: "editing", success: "" });
	});
});

describe("capture save eligibility", () => {
	const base = {
		phase: "reviewing" as const,
		result,
		rejectedItems: {},
		approvedSuggestionCount: 0,
		isEditingItem: false,
		isStale: false,
	};

	it("requires review, guardable content, and no open editor", () => {
		expect(canSaveCapture(base)).toBe(true);
		expect(canSaveCapture({ ...base, phase: "saving" })).toBe(false);
		expect(canSaveCapture({ ...base, isEditingItem: true })).toBe(false);
		expect(
			canSaveCapture({
				...base,
				result: { tasks: [], ideas: [], second_brain: [], suggestions: [] },
			}),
		).toBe(true);
		expect(
			canSaveCapture({
				...base,
				rejectedItems: { "task:0": true },
				result: {
					...result,
					tasks: [{ title: "only" }],
				} as CaptureOutput,
			}),
		).toBe(false);
	});

	it("blocks stale results", () => {
		expect(canSaveCapture({ ...base, isStale: true })).toBe(false);
	});
});

describe("capture keyboard shortcut", () => {
	it("processes only from a valid editing state", () => {
		expect(
			getCaptureShortcutAction({
				phase: "editing",
				hasNote: true,
				hasResult: false,
				isEditingItem: false,
				canSave: false,
			}),
		).toBe("process");
	});
	it("processes from loading while context is still pending", () => {
		expect(
			getCaptureShortcutAction({
				phase: "loading",
				hasNote: true,
				hasResult: false,
				isEditingItem: false,
				canSave: false,
			}),
		).toBe("process");
		expect(
			captureWorkflowReducer(initialCaptureWorkflowState, {
				type: "PROCESS_STARTED",
			}),
		).toMatchObject({ phase: "processing" });
	});

	it("saves only from a valid review without an item editor open", () => {
		const base = {
			phase: "reviewing" as const,
			hasNote: true,
			hasResult: true,
			canSave: true,
		};
		expect(getCaptureShortcutAction({ ...base, isEditingItem: false })).toBe(
			"save",
		);
		expect(getCaptureShortcutAction({ ...base, isEditingItem: true })).toBeNull();
	});

	it("ignores the shortcut while an operation is pending", () => {
		expect(
			getCaptureShortcutAction({
				phase: "saving",
				hasNote: true,
				hasResult: true,
				isEditingItem: false,
				canSave: true,
			}),
		).toBeNull();
	});
});
