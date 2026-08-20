import { describe, expect, it } from "vitest";
import type { CaptureDraft } from "@/lib/captures/draft";
import {
	captureReviewReducer,
	getCaptureReviewState,
	initialCaptureReviewState,
} from "@/lib/captures/review-state";
import type { CaptureOutput } from "@/types";

const result: CaptureOutput = {
	tasks: [
		{
			title: "Tarea",
			due_date: null,
			due_at: null,
			area_id: null,
			project_id: null,
			suggested_new_area: null,
			suggested_new_project: null,
		},
	],
	ideas: [{ content: "Idea", area_id: null, suggested_new_area: null }],
	second_brain: [
		{
			title: "Conocimiento",
			content: "Contenido",
			area_id: null,
			tags: [],
			suggested_new_area: null,
		},
	],
	suggestions: [],
};

const draft: CaptureDraft = {
	version: 1,
	rawNote: "Nota recuperada",
	idempotencyKey: "capture-key",
	result,
	approved: { "new_area:Trabajo": true },
	assignedAreas: { "task:0": "area-id" },
	rejectedItems: { "idea:0": true },
	editedValues: { "task:0": "Tarea editada" },
	projectAreas: { "new_project:Proyecto": "area-id" },
};

const transientState = {
	...initialCaptureReviewState,
	rawNote: "Nota en curso",
	result,
	approved: { suggestion: true },
	assignedAreas: { "task:0": "old-area" },
	rejectedItems: { "idea:0": true },
	editingItem: "task:0",
	editedValues: { "task:0": "cambio" },
	projectAreas: { project: "old-area" },
};

describe("capture review reducer", () => {
	it("changes the raw note without changing the rest of the review", () => {
		const state = captureReviewReducer(transientState, {
			type: "raw-note-changed",
			rawNote: "Nota nueva",
		});
		expect(state.rawNote).toBe("Nota nueva");
		expect(state.result).toBe(result);
		expect(state.assignedAreas).toBe(transientState.assignedAreas);
	});

	it("starts processing by clearing review UI while preserving rawNote", () => {
		const state = captureReviewReducer(transientState, {
			type: "processing-started",
		});
		expect(state).toEqual({
			rawNote: transientState.rawNote,
			result: null,
			approved: {},
			assignedAreas: {},
			rejectedItems: {},
			undoToken: null,
			editingItem: null,
			editedValues: {},
			projectAreas: {},
		});
	});

	it("keeps rawNote and only clears review UI when processing finishes", () => {
		const state = captureReviewReducer(transientState, {
			type: "processed",
			result,
		});
		expect(state).toEqual({
			rawNote: transientState.rawNote,
			result,
			approved: {},
			assignedAreas: {},
			rejectedItems: {},
			undoToken: null,
			editingItem: null,
			editedValues: {},
			projectAreas: {},
		});
	});

	it("tracks area and project-area assignments", () => {
		let state = captureReviewReducer(initialCaptureReviewState, {
			type: "assign-area",
			key: "task:0",
			value: "area-id",
		});
		state = captureReviewReducer(state, {
			type: "assign-project-area",
			key: "task:0",
			value: "project-area-id",
		});
		expect(state.assignedAreas).toEqual({ "task:0": "area-id" });
		expect(state.projectAreas).toEqual({ "task:0": "project-area-id" });
	});

	it("supports beginning, changing and cancelling an edit", () => {
		let state = captureReviewReducer(
			{ ...initialCaptureReviewState, result },
			{
				type: "begin-edit",
				key: "task:0",
				value: "Tarea inicial",
			},
		);
		expect(state.editingItem).toBe("task:0");
		state = captureReviewReducer(state, {
			type: "edit-value-changed",
			key: "task:0",
			value: "Tarea cambiada",
		});
		expect(state.editedValues).toEqual({ "task:0": "Tarea cambiada" });
		state = captureReviewReducer(state, { type: "cancel-edit" });
		expect(state.editingItem).toBeNull();
		expect(state.editedValues).toEqual({ "task:0": "Tarea cambiada" });
	});

	it.each([
		["task", "title", "Tarea corregida", 0],
		["idea", "content", "Idea corregida", 0],
		["knowledge", "title", "Conocimiento corregido", 0],
	] as const)("saves an edit for a %s", (kind, field, value, index) => {
		const previous = {
			...initialCaptureReviewState,
			result,
			editingItem: `${kind}:${index}`,
		};
		const state = captureReviewReducer(previous, {
			type: "save-edit",
			kind,
			index,
			value,
		});
		const items =
			kind === "task"
				? state.result?.tasks
				: kind === "idea"
					? state.result?.ideas
					: state.result?.second_brain;
		expect(items?.at(index)).toHaveProperty(field, value);
		expect(state.editingItem).toBeNull();
		expect(previous.result).toEqual(result);
	});

	it("hydrates a draft from a transient UI state without retaining editingItem", () => {
		const state = captureReviewReducer(transientState, {
			type: "hydrate-draft",
			draft,
		});
		expect(state).toEqual({
			rawNote: draft.rawNote,
			result: draft.result,
			approved: draft.approved,
			assignedAreas: draft.assignedAreas,
			rejectedItems: draft.rejectedItems,
			undoToken: null,
			editingItem: null,
			editedValues: draft.editedValues,
			projectAreas: draft.projectAreas,
		});
	});

	it("does not mutate the previous state", () => {
		const previous = structuredClone(transientState);
		const snapshot = structuredClone(previous);
		captureReviewReducer(previous, { type: "processing-started" });
		expect(previous).toEqual(snapshot);
		captureReviewReducer(previous, {
			type: "assign-area",
			key: "new",
			value: "area",
		});
		expect(previous).toEqual(snapshot);
	});

	it("supports exact one-level reject and undo", () => {
		const previous = {
			...initialCaptureReviewState,
			result,
			rejectedItems: { "task:0": false },
		};
		const rejected = captureReviewReducer(previous, {
			type: "reject-item",
			key: "task:0",
		});
		expect(rejected.rejectedItems).toEqual({ "task:0": true });
		const undone = captureReviewReducer(rejected, {
			type: "undo-reject",
			key: "task:0",
			token: rejected.undoToken!,
		});
		expect(undone.rejectedItems).toEqual({ "task:0": false });
		expect(undone.undoToken).toBeNull();
	});

	it("replaces the previous token and never revives an earlier discard", () => {
		const first = captureReviewReducer(
			{ ...initialCaptureReviewState, result },
			{ type: "reject-item", key: "task:0" },
		);
		const second = captureReviewReducer(first, {
			type: "reject-item",
			key: "idea:0",
		});
		expect(second.undoToken?.key).toBe("idea:0");
		const stale = captureReviewReducer(second, {
			type: "undo-reject",
			key: "task:0",
			token: first.undoToken!,
		});
		expect(stale).toBe(second);
		const undone = captureReviewReducer(second, {
			type: "undo-reject",
			key: "idea:0",
			token: second.undoToken!,
		});
		expect(undone.rejectedItems).toEqual({ "task:0": true });
	});

	it.each(["task:9", "task:0", "bogus:0"])(
		"ignores invalid or duplicate reject key %s",
		(key) => {
			const state = {
				...initialCaptureReviewState,
				result,
				rejectedItems: { "task:0": true },
			};
			const next = captureReviewReducer(state, { type: "reject-item", key });
			expect(next).toBe(state);
		},
	);

	it("invalidates undo on every effective review mutation", () => {
		const rejected = captureReviewReducer(
			{ ...initialCaptureReviewState, result },
			{ type: "reject-item", key: "task:0" },
		);
		const actions = [
			{ type: "raw-note-changed", rawNote: "x" },
			{ type: "approve-suggestion", key: "x", checked: true },
			{ type: "assign-area", key: "x", value: "a" },
			{ type: "assign-project-area", key: "x", value: "a" },
			{ type: "begin-edit", key: "x", value: "x" },
			{ type: "edit-value-changed", key: "x", value: "y" },
			{ type: "cancel-edit" },
		] as const;
		for (const action of actions) {
			const base =
				action.type === "cancel-edit"
					? { ...rejected, editingItem: "task:0" }
					: rejected;
			expect(captureReviewReducer(base, action).undoToken).toBeNull();
		}
		const savedEdit = captureReviewReducer(
			{ ...rejected, editingItem: "task:0" },
			{ type: "save-edit", kind: "task", index: 0, value: "editada" },
		);
		expect(savedEdit.undoToken).toBeNull();
		expect(
			captureReviewReducer(rejected, { type: "processing-started" }).undoToken,
		).toBeNull();
		expect(
			captureReviewReducer(rejected, { type: "processed", result }).undoToken,
		).toBeNull();
		expect(
			captureReviewReducer(rejected, { type: "reset-after-save" }).undoToken,
		).toBeNull();
	});

	it("resets the review after a successful save", () => {
		const state = captureReviewReducer(transientState, {
			type: "reset-after-save",
		});
		expect(state).toEqual(initialCaptureReviewState);
	});
});

describe("capture review derived state", () => {
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
			result,
			{ "task:0": true, "idea:0": true, "knowledge:0": true },
			0,
		);
		expect(state).toMatchObject({
			originallyEmpty: false,
			emptyAfterManualDiscard: true,
		});
	});
});
