"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/interior/loading-button";
import type { Task } from "@/types";

type TaskFormProps = {
	areaId: string;
	projectId?: string;
	onCreated: (task: Task) => void;
};

export default function TaskForm({
	areaId,
	projectId,
	onCreated,
}: TaskFormProps) {
	const [title, setTitle] = useState("");
	const [notes, setNotes] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	async function handleSubmit() {
		const cleanTitle = title.trim();
		if (!cleanTitle) {
			setError("El título de la tarea es necesario.");
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

		onCreated(data as Task);
		setTitle("");
		setNotes("");
		setDueDate("");
		setSaving(false);
	}

	return (
		<form
			className="space-y-3"
			onSubmit={(event) => {
				event.preventDefault();
				void handleSubmit();
			}}
		>
			<input
				className="input input-bordered w-full"
				placeholder="Título de la tarea"
				value={title}
				onChange={(event) => setTitle(event.target.value)}
				maxLength={200}
			/>
			<div className="grid gap-3 sm:grid-cols-[1fr_auto]">
				<input
					className="input input-bordered w-full"
					placeholder="Notas (opcional)"
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					maxLength={2000}
				/>
				<input
					className="input input-bordered"
					type="date"
					value={dueDate}
					onChange={(event) => setDueDate(event.target.value)}
					aria-label="Fecha límite"
				/>
			</div>
			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}
			<LoadingButton
				className="btn btn-primary"
				onAction={handleSubmit}
				pendingLabel="Creando…"
				disabled={saving}
			>
				Añadir tarea
			</LoadingButton>
		</form>
	);
}
