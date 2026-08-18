import type { SaveCaptureResult } from "@/types";

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseSaveCaptureResult(value: unknown): SaveCaptureResult {
	if (
		!value ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		typeof (value as Record<string, unknown>).batch_id !== "string" ||
		!isStringArray((value as Record<string, unknown>).affected_area_ids) ||
		!isStringArray((value as Record<string, unknown>).inbox_item_ids) ||
		typeof (value as Record<string, unknown>).existing !== "boolean"
	) {
		throw new Error("El servidor no devolvió un recibo de guardado válido.");
	}
	return value as SaveCaptureResult;
}
