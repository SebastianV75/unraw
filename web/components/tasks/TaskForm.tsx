"use client";

import { useState } from "react";
import { LoadingButton } from "@/components/interior/loading-button";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types";

type TaskFormProps = {
	areaId: string;
	projectId?: string;
	onCreatedAction: (task: Task) => void;
};

export default function TaskForm({
	areaId,
	projectId,
	onCreatedAction,
}: TaskFormProps) {
	const [title, setTitle] = useState("");
	const [notes, setNotes] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [showOptions, setShowOptions] = useState(false);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	async function handleSubmit() {
		const cleanTitle = title.trim();
		if (!cleanTitle) {
			setError("Escribe el título de la tarea.");
			return;
		}

		setSaving(true);
		setError("");
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			setError("Tu sesión ha caducado. Vuelve a iniciar sesión.");
			setSaving(false);
			return;
		}

		const { data, error: insertError } = await supabase
			.from("tasks")
			.insert({
				user_id: user.id,
				area_id: areaId,
				project_id: projectId ?? null,
				title: cleanTitle,
				notes: notes.trim() || null,
				due_date: dueDate || null,
			})
			.select("*")
			.single();

		if (insertError || !data) {
			setError("No pudimos crear la tarea. Inténtalo de nuevo.");
			setSaving(false);
			return;
		}

		onCreatedAction(data as Task);
		setTitle("");
		setNotes("");
		setDueDate("");
		setShowOptions(false);
		setSaving(false);
	}

	return (
		<div className="task-capture">
			<form
				className="task-quick-form"
				onSubmit={(event) => {
					event.preventDefault();
					void handleSubmit();
				}}
			>
				<div className="task-quick-row">
					<span className="task-quick-mark" aria-hidden="true">
						+
					</span>
					<input
						className="task-quick-input"
						placeholder="Escribe una tarea…"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						maxLength={200}
						aria-label="Título de la tarea"
					/>
					<LoadingButton
						className="task-quick-submit"
						onAction={handleSubmit}
						pendingLabel="Añadiendo…"
						disabled={saving || !title.trim()}
					>
						Añadir
					</LoadingButton>
				</div>
				<button
					className="task-options-toggle"
					type="button"
					aria-expanded={showOptions}
					onClick={() => setShowOptions((current) => !current)}
				>
					{showOptions ? "Ocultar opciones" : "Añadir fecha o nota"}
				</button>
				{showOptions && (
					<div className="task-extra-fields">
						<input
							className="task-extra-input"
							placeholder="Nota breve (opcional)"
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							maxLength={2000}
							aria-label="Nota de la tarea"
						/>
						<label className="task-date-field">
							<span>Vence</span>
							<input
								className="task-extra-input"
								type="date"
								value={dueDate}
								onChange={(event) => setDueDate(event.target.value)}
							/>
						</label>
					</div>
				)}
			</form>
			{error && (
				<p className="task-form-error" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
