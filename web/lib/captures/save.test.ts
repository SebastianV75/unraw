import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveCaptureTitle, saveCapture } from "@/lib/captures/save";

describe("deriveCaptureTitle", () => {
	it("uses the first non-empty line", () => {
		expect(deriveCaptureTitle("\n  ir al miércoles a la plática\ncon más detalle")).toBe("ir al miércoles a la plática");
	});

	it("removes Markdown list markers and truncates long titles", () => {
		const title = deriveCaptureTitle(`\n## - ${"una nota muy larga ".repeat(10)}`);
		expect(title.length).toBeLessThanOrEqual(96);
		expect(title).toMatch(/^una nota muy larga/);
		expect(title.endsWith("…")).toBe(true);
	});

	it("falls back when no usable title remains", () => {
		expect(deriveCaptureTitle(" \n\t")).toBe("Captura original");
		expect(deriveCaptureTitle("- \n")).toBe("Captura original");
	});
});

const mocks = vi.hoisted(() => ({
	createClient: vi.fn(),
	getUser: vi.fn(),
	rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
	createClient: mocks.createClient,
	getUser: mocks.getUser,
}));

const emptyOutput = {
	tasks: [],
	ideas: [],
	second_brain: [],
	suggestions: [],
};

function setupSupabase() {
	mocks.getUser.mockResolvedValue({ id: "user-1" });
	mocks.createClient.mockResolvedValue({
		from: (table: string) => ({
			select: () => ({
				eq: () =>
					Promise.resolve({
						data: table === "areas" ? [] : [],
						error: null,
					}),
			}),
		}),
		rpc: mocks.rpc,
	});
}

describe("saveCapture reliability policy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupSupabase();
		mocks.rpc.mockResolvedValue({
			data: {
				batch_id: "batch-1",
				affected_area_ids: [],
				inbox_item_ids: ["inbox-1"],
				existing: false,
			},
			error: null,
		});
	});

	it("sends the complete raw note to Inbox for an originally empty AI result", async () => {
		await saveCapture({
			idempotency_key: "00000000-0000-0000-0000-000000000001",
			raw_note: "  conserva\nla nota completa  ",
			confirmed_output: {
				...emptyOutput,
				suggestions: [
					{ type: "new_area", name: "Trabajo", reason: "Agrupa trabajo." },
				],
			},
			assignments: {
				"suggestion:new_area:trabajo":
					"00000000-0000-0000-0000-000000000000",
			},
			fallback_to_inbox: true,
		});

		expect(mocks.rpc).toHaveBeenCalledWith(
			"save_capture",
			expect.objectContaining({
				p_raw_note: "  conserva\nla nota completa  ",
				p_inbox: [
					{
						kind: "knowledge",
						title: "conserva",
						content: "  conserva\nla nota completa  ",
					},
				],
			}),
		);
	});

	it("does not create fallback when all original results were manually rejected", async () => {
		await expect(
			saveCapture({
				idempotency_key: "00000000-0000-0000-0000-000000000002",
				raw_note: "nota",
				confirmed_output: emptyOutput,
				assignments: {},
				fallback_to_inbox: false,
			}),
		).rejects.toThrow("No hay elementos para guardar");
		expect(mocks.rpc).not.toHaveBeenCalled();
	});

	it("propagates RPC failures instead of returning a false success", async () => {
		mocks.rpc.mockResolvedValueOnce({
			data: null,
			error: { message: "save failed" },
		});

		await expect(
			saveCapture({
				idempotency_key: "00000000-0000-0000-0000-000000000003",
				raw_note: "nota",
				confirmed_output: {
					tasks: [
						{
							title: "Tarea",
							due_date: null,
							due_at: null,
							area_id: null,
							project_id: null,
							suggested_new_area: null,
							suggested_new_project: null,
						},
					],
					ideas: [],
					second_brain: [],
					suggestions: [],
				},
				assignments: {},
			}),
		).rejects.toThrow("save failed");
	});

	it("emits one privacy-safe save event only after a successful receipt", async () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		await saveCapture({
			idempotency_key: "00000000-0000-0000-0000-000000000004",
			raw_note: "secret raw note",
			confirmed_output: emptyOutput,
			assignments: {},
			fallback_to_inbox: true,
			feedback: {
				generatedItems: 4,
				editedItems: 1,
				rejectedItems: 2,
				approvedSuggestions: 3,
			},
		});
		expect(info).toHaveBeenCalledTimes(1);
		const serialized = JSON.stringify(info.mock.calls[0]);
		expect(serialized).toContain('"event":"capture_saved"');
		expect(serialized).toContain('"savedItems":0');
		expect(serialized).toContain('"savedToInbox":1');
		expect(serialized).toContain('"generatedItems":4');
		expect(serialized).not.toContain("secret raw note");
		info.mockRestore();
	});

	it("rejects invalid feedback counters without calling the save RPC", async () => {
		await expect(
			saveCapture({
				idempotency_key: "00000000-0000-0000-0000-000000000005",
				raw_note: "nota",
				confirmed_output: emptyOutput,
				assignments: {},
				fallback_to_inbox: true,
				feedback: {
					generatedItems: -1,
					editedItems: 0,
					rejectedItems: 0,
					approvedSuggestions: 0,
				},
			}),
		).rejects.toThrow();
		expect(mocks.rpc).not.toHaveBeenCalled();
	});
	it("does not emit a save event when the RPC fails", async () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "save failed" } });
		await expect(
			saveCapture({
				idempotency_key: "00000000-0000-0000-0000-000000000006",
				raw_note: "nota",
				confirmed_output: {
					tasks: [{
						title: "Tarea",
						due_date: null,
						due_at: null,
						area_id: null,
						project_id: null,
						suggested_new_area: null,
						suggested_new_project: null,
					}],
					ideas: [],
					second_brain: [],
					suggestions: [],
				},
				assignments: {},
			}),
		).rejects.toThrow("save failed");
		expect(info).not.toHaveBeenCalled();
		info.mockRestore();
	});
});
