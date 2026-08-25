import { describe, expect, it } from "vitest";
import { isGlobalCaptureShortcut } from "./GlobalCaptureComposer";

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
