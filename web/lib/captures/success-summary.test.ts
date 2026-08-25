import { describe, expect, it } from "vitest";
import { formatSaveSuccess } from "@/lib/captures/success-summary";

describe("capture save success summary", () => {
	it("describes saved categories and Inbox without technical receipt IDs", () => {
		const message = formatSaveSuccess(
			{ tasks: 2, ideas: 1, secondBrain: 0, suggestions: 1, inbox: 3 },
			false,
		);
		expect(message).toContain("2 tareas");
		expect(message).toContain("1 idea");
		expect(message).toContain("1 sugerencia");
		expect(message).toContain("3 elementos quedaron en Inbox");
		expect(message).not.toContain("Recibo");
	});

	it("makes an idempotent save explicit", () => {
		expect(
			formatSaveSuccess(
				{ tasks: 0, ideas: 0, secondBrain: 0, suggestions: 0, inbox: 0 },
				true,
			),
		).toContain("ya estaba guardada");
	});
});
