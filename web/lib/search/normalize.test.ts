import { describe, expect, it } from "vitest";
import {
	matchesAllSearchTokens,
	normalizeSearchText,
	tokenizeSearchQuery,
} from "./normalize";

describe("search normalization", () => {
	it("normalizes case, accents and whitespace", () => {
		expect(normalizeSearchText("  Trabajó   PROFUNDO ")).toBe(
			"trabajo profundo",
		);
	});

	it("tokenizes a query into mandatory terms", () => {
		expect(tokenizeSearchQuery("Trabajo profundo")).toEqual([
			"trabajo",
			"profundo",
		]);
		expect(matchesAllSearchTokens("Bloque de trabajo profundo", [
			"trabajo",
			"profundo",
		])).toBe(true);
		expect(matchesAllSearchTokens("Trabajo semanal", [
			"trabajo",
			"profundo",
		])).toBe(false);
	});
});
