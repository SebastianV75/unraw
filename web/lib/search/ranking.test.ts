import { describe, expect, it } from "vitest";
import {
	buildSearchSnippet,
	calculateSearchScore,
	getHighlightRanges,
} from "./ranking";

describe("search ranking", () => {
	it("prioritizes exact titles over content matches", () => {
		expect(calculateSearchScore({ title: "Trabajo" }, "Trabajo")).toBe(100);
		expect(
			calculateSearchScore(
				{ title: "Otra nota", content: "Trabajo importante" },
				"Trabajo",
			),
		).toBe(45);
	});

	it("adds the project status bonus without changing the base order", () => {
		expect(
			calculateSearchScore(
				{ title: "Lanzamiento", projectStatus: "active" },
				"Lanzamiento",
			),
		).toBe(110);
		expect(
			calculateSearchScore(
				{ title: "Lanzamiento", projectStatus: "completed" },
				"Lanzamiento",
			),
		).toBe(100);
	});

	it("returns a two-line snippet and accent-safe ranges", () => {
		const snippet = buildSearchSnippet(
			"Primera línea\nTrabajo práctico\nTercera línea",
			["trabajo"],
		);
		expect(snippet?.text).toBe("Trabajo práctico\nTercera línea");
		expect(snippet?.highlightRanges).toEqual([[0, 7]]);
		expect(getHighlightRanges("Trabajó", ["trabajo"])).toEqual([[0, 7]]);
	});
});
