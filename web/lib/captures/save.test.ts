import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveCapture } from "@/lib/captures/save";

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
						title: "Captura original",
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

	it("rejects a successful RPC response without a durable receipt", async () => {
		mocks.rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });

		await expect(
			saveCapture({
				idempotency_key: "00000000-0000-0000-0000-000000000004",
				raw_note: "nota",
				confirmed_output: emptyOutput,
				assignments: {},
				fallback_to_inbox: true,
			}),
		).rejects.toThrow("recibo de guardado válido");
	});
});
