import type { CaptureDraft } from "@/lib/captures/draft";
import type { CaptureAssignments, CaptureOutput } from "@/types";

export type CaptureUndoToken = {
	key: string;
	previous: { present: boolean; value: boolean | undefined };
};

export type CaptureReviewState = {
	rawNote: string;
	result: CaptureOutput | null;
	approved: Record<string, boolean>;
	assignedAreas: CaptureAssignments;
	rejectedItems: Record<string, boolean>;
	undoToken: CaptureUndoToken | null;
	editingItem: string | null;
	editedValues: Record<string, string>;
	projectAreas: Record<string, string>;
};

export const initialCaptureReviewState: CaptureReviewState = {
	rawNote: "",
	result: null,
	approved: {},
	assignedAreas: {},
	rejectedItems: {},
	undoToken: null,
	editingItem: null,
	editedValues: {},
	projectAreas: {},
};

export type CaptureReviewAction =
	| { type: "hydrate-draft"; draft: CaptureDraft }
	| { type: "raw-note-changed"; rawNote: string }
	| { type: "processing-started" }
	| { type: "processed"; result: CaptureOutput }
	| { type: "approve-suggestion"; key: string; checked: boolean }
	| { type: "assign-area"; key: string; value: string | null }
	| { type: "assign-project-area"; key: string; value: string }
	| { type: "begin-edit"; key: string; value: string }
	| { type: "edit-value-changed"; key: string; value: string }
	| { type: "cancel-edit" }
	| {
			type: "save-edit";
			kind: "task" | "idea" | "knowledge";
			index: number;
			value: string;
	  }
	| { type: "reject-item"; key: string }
	| { type: "undo-reject"; key: string; token: CaptureUndoToken }
	| { type: "reset-after-save" };

function invalidateUndo(state: CaptureReviewState): CaptureReviewState {
	return state.undoToken ? { ...state, undoToken: null } : state;
}

function clearReview(state: CaptureReviewState): CaptureReviewState {
	return {
		...state,
		result: null,
		approved: {},
		assignedAreas: {},
		rejectedItems: {},
		undoToken: null,
		editingItem: null,
		editedValues: {},
		projectAreas: {},
	};
}

function isItemKey(result: CaptureOutput | null, key: string) {
	const match = /^(task|idea|knowledge):(\d+)$/.exec(key);
	if (!match || !result) return false;
	const index = Number(match[2]);
	return match[1] === "task"
		? index < result.tasks.length
		: match[1] === "idea"
			? index < result.ideas.length
			: index < result.second_brain.length;
}

export function captureReviewReducer(
	state: CaptureReviewState,
	action: CaptureReviewAction,
): CaptureReviewState {
	switch (action.type) {
		case "hydrate-draft":
			return {
				rawNote: action.draft.rawNote,
				result: action.draft.result,
				approved: action.draft.approved,
				assignedAreas: action.draft.assignedAreas,
				rejectedItems: action.draft.rejectedItems,
				undoToken: null,
				editingItem: null,
				editedValues: action.draft.editedValues,
				projectAreas: action.draft.projectAreas,
			};
		case "raw-note-changed":
			return state.rawNote === action.rawNote
				? state
				: invalidateUndo({ ...state, rawNote: action.rawNote });
		case "processing-started":
			return clearReview(state);
		case "processed":
			return { ...clearReview(state), result: action.result };
		case "approve-suggestion":
			if (state.approved[action.key] === action.checked) return state;
			return invalidateUndo({
				...state,
				approved: { ...state.approved, [action.key]: action.checked },
			});
		case "assign-area":
			if (state.assignedAreas[action.key] === action.value) return state;
			return invalidateUndo({
				...state,
				assignedAreas: { ...state.assignedAreas, [action.key]: action.value },
			});
		case "assign-project-area":
			if (state.projectAreas[action.key] === action.value) return state;
			return invalidateUndo({
				...state,
				projectAreas: { ...state.projectAreas, [action.key]: action.value },
			});
		case "begin-edit":
			if (
				state.editingItem === action.key &&
				state.editedValues[action.key] === action.value
			)
				return state;
			return invalidateUndo({
				...state,
				editedValues: { ...state.editedValues, [action.key]: action.value },
				editingItem: action.key,
			});
		case "edit-value-changed":
			if (state.editedValues[action.key] === action.value) return state;
			return invalidateUndo({
				...state,
				editedValues: { ...state.editedValues, [action.key]: action.value },
			});
		case "cancel-edit":
			return state.editingItem === null
				? state
				: invalidateUndo({ ...state, editingItem: null });
		case "save-edit": {
			if (!state.result) return state;
			const result = {
				...state.result,
				tasks: [...state.result.tasks],
				ideas: [...state.result.ideas],
				second_brain: [...state.result.second_brain],
			};
			const items =
				action.kind === "task"
					? result.tasks
					: action.kind === "idea"
						? result.ideas
						: result.second_brain;
			const item = items[action.index];
			if (!item) return state;
			const field = action.kind === "idea" ? "content" : "title";
			if (item[field] === action.value && state.editingItem === null) return state;
			items[action.index] = { ...item, [field]: action.value };
			return invalidateUndo({ ...state, result, editingItem: null });
		}
		case "reject-item":
			if (!isItemKey(state.result, action.key) || state.rejectedItems[action.key])
				return state;
			return {
				...state,
				rejectedItems: { ...state.rejectedItems, [action.key]: true },
				undoToken: {
					key: action.key,
					previous: {
						present: Object.prototype.hasOwnProperty.call(
							state.rejectedItems,
							action.key,
						),
						value: state.rejectedItems[action.key],
					},
				},
			};
		case "undo-reject":
			if (
				state.undoToken !== action.token ||
				state.undoToken.key !== action.key ||
				state.rejectedItems[action.key] !== true
			)
				return state;
			{
				const rejectedItems = { ...state.rejectedItems };
				if (action.token.previous.present)
					rejectedItems[action.key] = action.token.previous.value as boolean;
				else delete rejectedItems[action.key];
				return { ...state, rejectedItems, undoToken: null };
			}
		case "reset-after-save":
			return initialCaptureReviewState;
	}
}

export function getCaptureReviewState(
	result: CaptureOutput,
	rejectedItems: Record<string, boolean>,
	approvedSuggestionCount: number,
) {
	const originallyEmpty =
		result.tasks.length === 0 &&
		result.ideas.length === 0 &&
		result.second_brain.length === 0;
	const remainingResultCount =
		result.tasks.filter((_, index) => !rejectedItems[`task:${index}`]).length +
		result.ideas.filter((_, index) => !rejectedItems[`idea:${index}`]).length +
		result.second_brain.filter((_, index) => !rejectedItems[`knowledge:${index}`])
			.length;

	return {
		originallyEmpty,
		emptyAfterManualDiscard:
			!originallyEmpty &&
			remainingResultCount === 0 &&
			approvedSuggestionCount === 0,
		remainingResultCount,
	};
}
