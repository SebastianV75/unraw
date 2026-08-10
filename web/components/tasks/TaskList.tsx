"use client";

import { useState } from "react";
import { LoadingButton } from "@/components/interior/loading-button";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/types";

const statusLabels: Record<TaskStatus, string> = {
	pending: "Pendiente",
	in_progress: "En curso",
	done: "Hecha",
};

type TaskListProps = {
	tasks: Task[];
	onStatusChangedAction: (task: Task) => void;
	onDeletedAction: (id: string) => void;
};

function formatDueDate(value: string) {
	return new Intl.DateTimeFormat("es", {
		day: "numeric",
		month: "short",
	}).format(new Date(`${value}T12:00:00`));
}

function nextStatus(status: TaskStatus): TaskStatus {
	if (status === "pending") return "in_progress";
	if (status === "in_progress") return "done";
	return "pending";
}

export default function TaskList({
	tasks,
	onStatusChangedAction,
	onDeletedAction,
}: TaskListProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [notes, setNotes] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState("");

	async function changeStatus(task: Task, status: TaskStatus) {
		setBusyId(task.id);
		setError("");
		const { data, error: updateError } = await createClient()
			.from("tasks")
			.update({ status })
			.eq("id", task.id)
			.eq("user_id", task.user_id)
			.select("*")
			.single();
		if (!updateError && data) onStatusChangedAction(data as Task);
		else setError("No pudimos actualizar el estado. Inténtalo de nuevo.");
		setBusyId(null);
	}

	function startEditing(task: Task) {
		setEditingId(task.id);
		setTitle(task.title);
		setNotes(task.notes ?? "");
		setDueDate(task.due_date ?? "");
		setError("");
	}

	async function updateTask(task: Task) {
		const cleanTitle = title.trim();
		if (!cleanTitle) {
			setError("Escribe el título de la tarea.");
			return;
		}
		setBusyId(task.id);
		setError("");
		const { data, error: updateError } = await createClient()
			.from("tasks")
			.update({
				title: cleanTitle,
				notes: notes.trim() || null,
				due_date: dueDate || null,
			})
			.eq("id", task.id)
			.eq("user_id", task.user_id)
			.select("*")
			.single();
		if (updateError || !data) {
			setError("No pudimos actualizar la tarea. Inténtalo de nuevo.");
		} else {
			onStatusChangedAction(data as Task);
			setEditingId(null);
		}
		setBusyId(null);
	}

	async function remove(task: Task) {
		if (!window.confirm("¿Eliminar esta tarea?")) return;
		setBusyId(task.id);
		setError("");
		const { error: deleteError } = await createClient()
			.from("tasks")
			.delete()
			.eq("id", task.id)
			.eq("user_id", task.user_id);
		if (deleteError)
			setError("No pudimos eliminar la tarea. Inténtalo de nuevo.");
		else onDeletedAction(task.id);
		setBusyId(null);
	}

	if (tasks.length === 0)
		return (
			<p className="task-empty-state">
				Aún no hay tareas. Añade la primera arriba.
			</p>
		);

	return (
		<div className="task-list">
			{error && (
				<p className="task-form-error" role="alert">
					{error}
				</p>
			)}
			{tasks.map((task) => (
				<article
					className={`task-row ${task.status === "done" ? "is-done" : ""}`}
					key={task.id}
				>
					{editingId === task.id ? (
						<form
							className="task-edit-panel"
							onSubmit={(event) => {
								event.preventDefault();
								void updateTask(task);
							}}
						>
							<input
								className="task-edit-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								maxLength={200}
								aria-label="Título de la tarea"
							/>
							<textarea
								className="task-edit-notes"
								placeholder="Añadir una nota…"
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								maxLength={2000}
							/>
							<div className="task-edit-footer">
								<label className="task-date-field">
									<span>Vence</span>
									<input
										className="task-extra-input"
										type="date"
										value={dueDate}
										onChange={(event) => setDueDate(event.target.value)}
									/>
								</label>
								<div className="task-edit-actions">
									<LoadingButton
										className="task-quick-submit"
										onAction={() => updateTask(task)}
										pendingLabel="Guardando…"
										disabled={busyId === task.id}
									>
										Guardar
									</LoadingButton>
									<button
										className="task-text-button"
										type="button"
										onClick={() => setEditingId(null)}
										disabled={busyId === task.id}
									>
										Cancelar
									</button>
								</div>
							</div>
						</form>
					) : (
						<>
							<div className="task-row-main">
								<button
									className={`task-status-button status-${task.status}`}
									type="button"
									onClick={() =>
										void changeStatus(task, nextStatus(task.status))
									}
									disabled={busyId === task.id}
									aria-label={`${task.title}: ${statusLabels[task.status]}. Cambiar estado`}
									title={`Estado: ${statusLabels[task.status]}. Haz clic para cambiar`}
								>
									<span aria-hidden="true" />
								</button>
								<div className="task-row-copy">
									<h3>{task.title}</h3>
									{task.notes && <p>{task.notes}</p>}
									{task.due_date && (
										<span className="task-due-badge">
											Vence {formatDueDate(task.due_date)}
										</span>
									)}
								</div>
							</div>
							<div className="task-row-actions">
								<button
									className="task-status-label"
									type="button"
									onClick={() =>
										void changeStatus(task, nextStatus(task.status))
									}
									disabled={busyId === task.id}
								>
									{statusLabels[task.status]}
								</button>
								<button
									className="task-text-button"
									type="button"
									onClick={() => startEditing(task)}
									disabled={busyId === task.id}
								>
									Editar
								</button>
								<button
									className="task-text-button task-delete-button"
									type="button"
									onClick={() => void remove(task)}
									disabled={busyId === task.id}
								>
									Eliminar
								</button>
							</div>
						</>
					)}
				</article>
			))}
		</div>
	);
}
