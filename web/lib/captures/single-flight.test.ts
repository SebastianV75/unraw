import { describe, expect, it, vi } from "vitest";
import { runSingleFlight, type PromiseRef } from "@/lib/captures/single-flight";

describe("capture single-flight", () => {
	it("shares concurrent work and clears the flight after success", async () => {
		const ref: PromiseRef<string> = { current: null };
		const action = vi.fn(async () => "saved");

		const first = runSingleFlight(ref, action);
		const second = runSingleFlight(ref, action);

		expect(second).toBe(first);
		expect(await first).toBe("saved");
		expect(action).toHaveBeenCalledOnce();
		expect(await runSingleFlight(ref, action)).toBe("saved");
		expect(action).toHaveBeenCalledTimes(2);
	});

	it("propagates rejection and allows a later retry", async () => {
		const ref: PromiseRef<string> = { current: null };
		const action = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error("network down"))
			.mockResolvedValueOnce("saved");

		await expect(runSingleFlight(ref, action)).rejects.toThrow("network down");
		expect(await runSingleFlight(ref, action)).toBe("saved");
		expect(action).toHaveBeenCalledTimes(2);
	});
});
