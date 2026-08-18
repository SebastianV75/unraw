import type {
	CaptureAssignments,
	CaptureOutput,
} from "@/types";

export const CAPTURE_DRAFT_KEY = "unraw-capture-draft";
export const CAPTURE_DRAFT_VERSION = 1 as const;

export type CaptureDraft = {
	version: typeof CAPTURE_DRAFT_VERSION;
	rawNote: string;
	idempotencyKey: string;
	result: CaptureOutput | null;
	approved: Record<string, boolean>;
	assignedAreas: CaptureAssignments;
	rejectedItems: Record<string, boolean>;
	editedValues: Record<string, string>;
	projectAreas: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCaptureOutput(value: unknown): value is CaptureOutput {
	if (!isRecord(value)) return false;
	return (
		Array.isArray(value.tasks) &&
		Array.isArray(value.ideas) &&
		Array.isArray(value.second_brain) &&
		Array.isArray(value.suggestions)
	);
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		isRecord(value) &&
		Object.values(value).every((item) => typeof item === "string")
	);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
	return (
		isRecord(value) &&
		Object.values(value).every((item) => typeof item === "boolean")
	);
}

function isNullableStringRecord(
	value: unknown,
): value is Record<string, string | null> {
	return (
		isRecord(value) &&
		Object.values(value).every(
			(item) => typeof item === "string" || item === null,
		)
	);
}

function createLegacyDraft(rawNote: string): CaptureDraft | null {
	if (!rawNote.trim()) return null;
	return {
		version: CAPTURE_DRAFT_VERSION,
		rawNote,
		idempotencyKey: "",
		result: null,
		approved: {},
		assignedAreas: {},
		rejectedItems: {},
		editedValues: {},
		projectAreas: {},
	};
}

export function readCaptureDraft(value: string | null): CaptureDraft | null {
	if (!value) return null;
	if (!value.trim().startsWith("{")) return createLegacyDraft(value);
	try {
		const parsed: unknown = JSON.parse(value);
		// Legacy drafts were stored as raw text. Keep any value that is not a
		// current draft as text too, including notes that happen to be JSON.
		if (!isRecord(parsed) || parsed.version !== CAPTURE_DRAFT_VERSION)
			return createLegacyDraft(value);
		if (
			typeof parsed.rawNote !== "string" ||
			typeof parsed.idempotencyKey !== "string" ||
			(parsed.result !== null && !isCaptureOutput(parsed.result)) ||
			!isBooleanRecord(parsed.approved) ||
			!isNullableStringRecord(parsed.assignedAreas) ||
			!isBooleanRecord(parsed.rejectedItems) ||
			!isStringRecord(parsed.editedValues) ||
			!isStringRecord(parsed.projectAreas)
		) {
			return createLegacyDraft(value);
		}
		return parsed as unknown as CaptureDraft;
	} catch {
		return createLegacyDraft(value);
	}
}

export function writeCaptureDraft(draft: CaptureDraft) {
	if (typeof window === "undefined") return;
	window.sessionStorage.setItem(CAPTURE_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCaptureDraft() {
	if (typeof window === "undefined") return;
	window.sessionStorage.removeItem(CAPTURE_DRAFT_KEY);
}
