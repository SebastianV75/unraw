import {
	hashCaptureNote,
	type CaptureDraft,
	type CaptureEditedFields,
} from "@/lib/captures/draft";
import type { CaptureAssignments, CaptureOutput, Project } from "@/types";

export type CaptureUndoToken = {
	key: string;
	previous: { present: boolean; value: boolean | undefined };
};

export type CaptureReviewState = {
	rawNote: string;
	result: CaptureOutput | null;
	resultNoteHash: string | null;
	isStale: boolean;
	approved: Record<string, boolean>;
	assignedAreas: CaptureAssignments;
	assignedProjects: CaptureAssignments;
	rejectedItems: Record<string, boolean>;
	undoToken: CaptureUndoToken | null;
	editingItem: string | null;
	editedValues: Record<string, string>;
	editedFields?: Record<string, CaptureEditedFields>;
	editingFields?: Record<string, CaptureEditedFields>;
	projectAreas: Record<string, string>;
};

export const initialCaptureReviewState: CaptureReviewState = {
	rawNote: "",
	result: null,
	resultNoteHash: null,
	isStale: false,
	approved: {},
	assignedAreas: {},
	assignedProjects: {},
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
	| { type: "processed"; result: CaptureOutput; noteHash?: string }
	| { type: "approve-suggestion"; key: string; checked: boolean }
	| { type: "assign-area"; key: string; value: string | null; projectAreasById?: Record<string, string> }
	| { type: "assign-project"; key: string; value: string | null }
	| { type: "assign-project-area"; key: string; value: string }
	| { type: "begin-edit"; key: string; value: string }
	| { type: "edit-value-changed"; key: string; value: string }
	| {
			type: "edit-field-changed";
			key: string;
			field: keyof CaptureEditedFields;
			value: string | null | string[];
	  }
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
		assignedProjects: {},
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
				resultNoteHash: action.draft.processedNoteHash ?? null,
				// A v1 draft without a hash can be recovered, but its result cannot
				// be proven to belong to this note and must be reprocessed.
				isStale:
					Boolean(action.draft.result) &&
					(!action.draft.processedNoteHash ||
						action.draft.processedNoteHash !== hashCaptureNote(action.draft.rawNote)),
				approved: action.draft.approved,
				assignedAreas: action.draft.assignedAreas,
				assignedProjects: action.draft.assignedProjects ?? {},
				rejectedItems: action.draft.rejectedItems,
				undoToken: null,
				editingItem: null,
				editedValues: action.draft.editedValues,
				...(action.draft.editedFields ? { editedFields: action.draft.editedFields } : {}),
				projectAreas: action.draft.projectAreas,
			};
		case "raw-note-changed":
			return state.rawNote === action.rawNote
				? state
				: invalidateUndo({
						...state,
						rawNote: action.rawNote,
						isStale:
							state.result !== null &&
							hashCaptureNote(action.rawNote) !== state.resultNoteHash,
					});
		case "processing-started":
			// Keep the complete review snapshot visible while the replacement is pending.
			return state;
		case "processed":
			return {
				...clearReview(state),
				result: action.result,
				resultNoteHash: action.noteHash ?? hashCaptureNote(state.rawNote),
				isStale: false,
			};
		case "approve-suggestion":
			if (state.approved[action.key] === action.checked) return state;
			return invalidateUndo({
				...state,
				approved: { ...state.approved, [action.key]: action.checked },
			});
		case "assign-area":
			return invalidateUndo({
				...state,
				assignedAreas: { ...state.assignedAreas, [action.key]: action.value },
				assignedProjects:
					action.projectAreasById && state.assignedProjects[action.key] &&
					action.value !== action.projectAreasById[state.assignedProjects[action.key]]
						? { ...state.assignedProjects, [action.key]: null }
						: state.assignedProjects,
			});
		case "assign-project":
			if (state.assignedProjects[action.key] === action.value) return state;
			return invalidateUndo({
				...state,
				assignedProjects: { ...state.assignedProjects, [action.key]: action.value },
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
		case "edit-field-changed": {
			const current = state.editingFields?.[action.key] ?? state.editedFields?.[action.key] ?? {};
			return invalidateUndo({
				...state,
				editingFields: {
					...(state.editingFields ?? {}),
					[action.key]: { ...current, [action.field]: action.value },
				},
			});
		}
		case "cancel-edit": {
			if (state.editingItem === null) return state;
			const { editingFields: _editingFields, ...rest } = state;
			return invalidateUndo({ ...rest, editingItem: null });
		}
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
			const key = `${action.kind}:${action.index}`;
			const fields = { ...(state.editingFields?.[key] ?? state.editedFields?.[key] ?? {}) };
			const primary = action.kind === "idea" ? "content" : "title";
			const primaryValue = action.value.trim();
			fields[primary] = primaryValue;
			if (fields.title !== undefined) fields.title = fields.title.trim();
			if (fields.content !== undefined) fields.content = fields.content.trim();
			if (fields.due_date !== undefined && fields.due_date !== null) {
				fields.due_date = /^\d{4}-\d{2}-\d{2}$/.test(fields.due_date)
					? fields.due_date
					: null;
			}
			if (fields.tags) fields.tags = fields.tags.map((tag) => tag.trim()).filter(Boolean);
			items[action.index] = { ...item, ...fields };
			return invalidateUndo({
				...state,
				result,
				editedFields: { ...state.editedFields, [key]: fields },
				editingItem: null,
			});
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

export function getCaptureReviewAttention(
	result: CaptureOutput,
	rejectedItems: Record<string, boolean>,
	assignedAreas: CaptureAssignments,
	assignedProjects: CaptureAssignments,
	projects: Project[],
) {
	const projectById = new Map(projects.map((project) => [project.id, project]));
	let attentionCount = 0;

	const hasAttention = (
		kind: "task" | "idea" | "knowledge",
		index: number,
		item: {
			area_id: string | null;
			suggested_new_area: string | null;
			suggested_new_project?: string | null;
			project_id?: string | null;
		},
	) => {
		if (rejectedItems[`${kind}:${index}`]) return;
		const areaKey = `${kind}:${index}`;
		const effectiveArea = Object.prototype.hasOwnProperty.call(assignedAreas, areaKey)
			? assignedAreas[areaKey]
			: item.area_id;
		const effectiveProject =
			kind === "task"
				? Object.prototype.hasOwnProperty.call(assignedProjects, areaKey)
					? assignedProjects[areaKey]
					: item.project_id ?? null
				: null;
		const project = effectiveProject ? projectById.get(effectiveProject) : null;
		if (
			!effectiveArea ||
			item.suggested_new_area ||
			item.suggested_new_project ||
			(kind === "task" &&
				(!effectiveProject || !project || project.area_id !== effectiveArea))
		) {
			attentionCount += 1;
		}
	};

	result.tasks.forEach((item, index) => hasAttention("task", index, item));
	result.ideas.forEach((item, index) => hasAttention("idea", index, item));
	result.second_brain.forEach((item, index) => hasAttention("knowledge", index, item));
	return attentionCount;
}
export function getDeterministicCaptureDefaults(
	result: CaptureOutput,
	areas: Array<{ id: string; name: string }>,
	projects: Array<{ id: string; name: string; area_id: string }>,
) {
	const assignedAreas: CaptureAssignments = {};
	const assignedProjects: CaptureAssignments = {};
	const areaByName = new Map(areas.map((area) => [area.name.trim().toLowerCase(), area.id]));
	const projectsByArea = new Map<string, Array<{ id: string; name: string }>>();
	for (const project of projects) {
		const list = projectsByArea.get(project.area_id) ?? [];
		list.push(project);
		projectsByArea.set(project.area_id, list);
	}
	const resolveArea = (item: { area_id: string | null; suggested_new_area: string | null }) =>
		item.area_id ??
		(item.suggested_new_area
			? areaByName.get(item.suggested_new_area.trim().toLowerCase()) ?? null
			: null) ??
		(areas.length === 1 ? areas[0].id : null);
	const resolveProject = (
		area: string | null,
		item: { project_id?: string | null; suggested_new_project?: string | null },
) => {
		if (!area) return null;
		if (item.project_id && projects.some((project) => project.id === item.project_id && project.area_id === area))
			return item.project_id;
		const available = projectsByArea.get(area) ?? [];
		if (item.suggested_new_project) {
			const exact = available.find(
				(project) => project.name.trim().toLowerCase() === item.suggested_new_project?.trim().toLowerCase(),
			);
			if (exact) return exact.id;
		}
		return available.length === 1 ? available[0].id : null;
	};
	result.tasks.forEach((item, index) => {
		const area = resolveArea(item);
		if (area) assignedAreas[`task:${index}`] = area;
		const project = resolveProject(area, item);
		if (project) assignedProjects[`task:${index}`] = project;
	});
	result.ideas.forEach((item, index) => {
		const area = resolveArea(item);
		if (area) assignedAreas[`idea:${index}`] = area;
	});
	result.second_brain.forEach((item, index) => {
		const area = resolveArea(item);
		if (area) assignedAreas[`knowledge:${index}`] = area;
	});
	return { assignedAreas, assignedProjects };
}
