import type { Task, TaskStatus } from "@/types";

export const taskStatuses: TaskStatus[] = ["pending", "in_progress", "done"];
export function getTaskDropStatus(current: TaskStatus, target: TaskStatus): TaskStatus | null {
	return current === target ? null : target;
}

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
	return tasks.reduce(
		(groups, task) => {
			groups[task.status].push(task);
			return groups;
		},
		{
			pending: [],
			in_progress: [],
			done: [],
		} as Record<TaskStatus, Task[]>,
	);
}
