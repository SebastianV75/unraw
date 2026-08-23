import type { CaptureOutput } from "@/types";

export type CaptureWorkflowPhase =
	| "loading"
	| "editing"
	| "processing"
	| "reviewing"
	| "saving"
	| "success";

export type CaptureWorkflowState = {
	phase: CaptureWorkflowPhase;
	result: CaptureOutput | null;
	error: string;
	success: string;
};

export type CaptureWorkflowAction =
	| { type: "HYDRATE_RESULT"; result: CaptureOutput | null }
	| { type: "NOTE_CHANGED" }
	| { type: "CONTEXT_READY" }
	| { type: "CONTEXT_FAILED"; message: string }
	| { type: "PROCESS_STARTED" }
	| { type: "PROCESS_SUCCEEDED"; result: CaptureOutput }
	| { type: "PROCESS_FAILED"; message: string }
	| { type: "RESULT_CHANGED"; result: CaptureOutput }
	| { type: "SAVE_STARTED" }
	| { type: "SAVE_SUCCEEDED"; message: string }
	| { type: "SAVE_FAILED"; message: string };

export const initialCaptureWorkflowState: CaptureWorkflowState = {
	phase: "loading",
	result: null,
	error: "",
	success: "",
};

function phaseAllowsContextUpdate(phase: CaptureWorkflowPhase) {
	return phase === "loading" || phase === "editing" || phase === "reviewing";
}

export function captureWorkflowReducer(
	state: CaptureWorkflowState,
	action: CaptureWorkflowAction,
): CaptureWorkflowState {
	switch (action.type) {
		case "HYDRATE_RESULT":
		case "RESULT_CHANGED":
			return {
				...state,
				result: action.result,
				phase:
					action.result && phaseAllowsContextUpdate(state.phase)
						? "reviewing"
						: state.phase,
			};
		case "NOTE_CHANGED":
			return state.phase === "success"
				? { ...state, phase: "editing", success: "" }
				: state;
		case "CONTEXT_READY":
			return phaseAllowsContextUpdate(state.phase)
				? {
						...state,
						phase: state.result ? "reviewing" : "editing",
					}
				: state;
		case "CONTEXT_FAILED":
			return phaseAllowsContextUpdate(state.phase)
				? {
						...state,
						phase: state.result ? "reviewing" : "editing",
						error: action.message,
					}
				: state;
		case "PROCESS_STARTED":
			return {
				...state,
				phase: "processing",
				result: null,
				error: "",
				success: "",
			};
		case "PROCESS_SUCCEEDED":
			return {
				...state,
				phase: "reviewing",
				result: action.result,
			};
		case "PROCESS_FAILED":
			return { ...state, phase: "editing", error: action.message };
		case "SAVE_STARTED":
			return { ...state, phase: "saving", error: "", success: "" };
		case "SAVE_SUCCEEDED":
			return {
				phase: "success",
				result: null,
				error: "",
				success: action.message,
			};
		case "SAVE_FAILED":
			return { ...state, phase: "reviewing", error: action.message };
	}
}

export function canSaveCapture({
	phase,
	result,
	rejectedItems,
	approvedSuggestionCount,
	isEditingItem,
}: {
	phase: CaptureWorkflowPhase;
	result: CaptureOutput | null;
	rejectedItems: Record<string, boolean>;
	approvedSuggestionCount: number;
	isEditingItem: boolean;
}): boolean {
	if (phase !== "reviewing" || !result || isEditingItem) return false;
	const originallyEmpty =
		result.tasks.length === 0 &&
		result.ideas.length === 0 &&
		result.second_brain.length === 0;
	const remainingResultCount =
		result.tasks.filter((_, index) => !rejectedItems[`task:${index}`]).length +
		result.ideas.filter((_, index) => !rejectedItems[`idea:${index}`]).length +
		result.second_brain.filter((_, index) => !rejectedItems[`knowledge:${index}`])
			.length;
	return (
		originallyEmpty || remainingResultCount > 0 || approvedSuggestionCount > 0
	);
}

export type CaptureShortcutAction = "process" | "save" | null;

export function getCaptureShortcutAction({
	phase,
	hasNote,
	hasResult,
	isEditingItem,
	canSave,
}: {
	phase: CaptureWorkflowPhase;
	hasNote: boolean;
	hasResult: boolean;
	isEditingItem: boolean;
	canSave: boolean;
}): CaptureShortcutAction {
	if (phase === "editing" && hasNote && !hasResult) return "process";
	if (phase === "reviewing" && hasResult && !isEditingItem && canSave)
		return "save";
	return null;
}
