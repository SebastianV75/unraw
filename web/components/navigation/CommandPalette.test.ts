import { describe, expect, it } from "vitest";
import { isCommandPaletteShortcut } from "./CommandPalette";

describe("CommandPalette shortcut", () => {
	it("accepts Ctrl/Cmd+K by physical key code", () => {
		expect(
			isCommandPaletteShortcut({
				ctrlKey: true,
				metaKey: false,
				key: "к",
				code: "KeyK",
			}),
		).toBe(true);
		expect(
			isCommandPaletteShortcut({
				ctrlKey: false,
				metaKey: true,
				key: "K",
				code: "KeyK",
			}),
		).toBe(true);
	});

	it("keeps key fallback and rejects unrelated shortcuts", () => {
		expect(
			isCommandPaletteShortcut({
				ctrlKey: true,
				metaKey: false,
				key: "k",
				code: "",
			}),
		).toBe(true);
		expect(
			isCommandPaletteShortcut({
				ctrlKey: false,
				metaKey: true,
				key: "x",
				code: "KeyX",
			}),
		).toBe(false);
		expect(
			isCommandPaletteShortcut({
				ctrlKey: false,
				metaKey: false,
				key: "k",
				code: "KeyK",
			}),
		).toBe(false);
	});
});
