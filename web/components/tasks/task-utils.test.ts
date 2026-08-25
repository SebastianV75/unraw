import { describe, expect, it } from "vitest";
import { getTaskDropStatus, groupTasksByStatus } from "./task-utils";
import type { Task } from "@/types";

const task = (id: string, status: Task["status"]): Task => ({
	id,
	user_id: "user",
	area_id: "area",
	project_id: null,
	title: id,
	notes: null,
	status,
	due_date: null,
	due_at: null,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
});

describe("groupTasksByStatus", () => {
	it("groups all statuses while preserving task order", () => {
		const result = groupTasksByStatus([
			task("a", "done"),
			task("b", "pending"),
			task("c", "pending"),
			task("d", "in_progress"),
		]);
		expect(result.pending.map((item) => item.id)).toEqual(["b", "c"]);
		expect(result.in_progress.map((item) => item.id)).toEqual(["d"]);
		expect(result.done.map((item) => item.id)).toEqual(["a"]);
	});

	it("returns empty columns for an empty list", () => {
		expect(groupTasksByStatus([])).toEqual({ pending: [], in_progress: [], done: [] });
	});
});

describe("getTaskDropStatus", () => {
	it("returns the destination when moving between columns", () => {
		expect(getTaskDropStatus("pending", "done")).toBe("done");
	});

	it("returns null when dropped in the current column", () => {
		expect(getTaskDropStatus("in_progress", "in_progress")).toBeNull();
	});
});
