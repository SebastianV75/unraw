import { describe, expect, it } from "vitest";
import { canStartCaptureSave, shouldSubmitCaptureOnEnter } from "./quick-capture-interaction";
import {
	CaptureHttpError,
	captureErrorMessage,
	isGlobalCaptureShortcut,
	parseCaptureResponse,
} from "./GlobalCaptureComposer";

describe("GlobalCaptureComposer shortcut", () => {
	it("accepts Ctrl/Cmd+Shift+Space", () => {
		expect(
			isGlobalCaptureShortcut({
				ctrlKey: true,
				metaKey: false,
				shiftKey: true,
				key: " ",
				code: "Space",
				repeat: false,
				target: null,
			}),
		).toBe(true);
		expect(
			isGlobalCaptureShortcut({
				ctrlKey: false,
				metaKey: true,
				shiftKey: true,
				key: "Spacebar",
				code: "Space",
				repeat: false,
				target: null,
			}),
		).toBe(true);
	});

	it("rejects repeats and shortcuts without the full modifier chord", () => {
		const base = {
			ctrlKey: true,
			metaKey: false,
			shiftKey: true,
			key: " ",
			code: "Space",
			repeat: false,
			target: null,
		};
		expect(isGlobalCaptureShortcut({ ...base, repeat: true })).toBe(false);
		expect(isGlobalCaptureShortcut({ ...base, shiftKey: false })).toBe(false);
		expect(isGlobalCaptureShortcut({ ...base, ctrlKey: false, metaKey: false })).toBe(false);
	});
});

describe("quick capture interaction rules", () => {
	it("submits only plain, non-composing, non-repeated Enter", () => {
		const enter = { key: "Enter", shiftKey: false, isComposing: false, repeat: false };
		expect(shouldSubmitCaptureOnEnter(enter)).toBe(true);
		expect(shouldSubmitCaptureOnEnter({ ...enter, shiftKey: true })).toBe(false);
		expect(shouldSubmitCaptureOnEnter({ ...enter, isComposing: true })).toBe(false);
		expect(shouldSubmitCaptureOnEnter({ ...enter, repeat: true })).toBe(false);
	});

	it("uses trimmed content and a synchronous single-flight lock decision", () => {
		expect(canStartCaptureSave(" note ", false)).toBe(true);
		expect(canStartCaptureSave("  ", false)).toBe(false);
		expect(canStartCaptureSave("note", true)).toBe(false);
	});
});

describe("GlobalCaptureComposer save response handling", () => {
	it("preserves backend errors and HTTP status", async () => {
		const response = new Response(JSON.stringify({ error: "Authentication is required." }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});

		await expect(parseCaptureResponse(response)).rejects.toMatchObject({
			name: "CaptureHttpError",
			status: 401,
			message: "Authentication is required.",
		});
	});

	it("reports an invalid response without turning it into a network error", async () => {
		const response = new Response("upstream failure", { status: 502 });

		await expect(parseCaptureResponse(response)).rejects.toEqual(
			new CaptureHttpError(
				502,
				"El servidor devolvió una respuesta no válida (HTTP 502).",
			),
		);
	});

	it("uses a distinct message for fetch rejections", () => {
		expect(captureErrorMessage(new TypeError("Failed to fetch"))).toBe(
			"No se pudo conectar con el servidor.",
		);
	});
});
