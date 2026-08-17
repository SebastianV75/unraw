import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "./dates";

describe("search date parsing", () => {
	const now = new Date(2026, 7, 16, 12, 0, 0);

	it("resolves relative dates using the local calendar", () => {
		expect(parseSearchQuery("Preparar mañana", now)).toMatchObject({
			text: "preparar",
			tokens: ["preparar"],
			dueDate: "2026-08-17",
			datePhrase: "manana",
		});
	});

	it("resolves Spanish month dates without changing the year", () => {
		expect(parseSearchQuery("15 de agosto", now)).toMatchObject({
			text: "",
			tokens: [],
			dueDate: "2026-08-15",
		});
	});

	it("resolves the next weekday including today", () => {
		expect(parseSearchQuery("domingo", now).dueDate).toBe("2026-08-16");
		expect(parseSearchQuery("lunes", now).dueDate).toBe("2026-08-17");
	});

	it("keeps unrecognized dates as normal text", () => {
		expect(parseSearchQuery("31 de febrero", now)).toMatchObject({
			text: "31 de febrero",
			dueDate: null,
		});
	});
});
