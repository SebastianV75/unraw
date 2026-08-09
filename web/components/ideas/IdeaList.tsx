"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/interior/loading-button";
import type { Idea, IdeaStatus } from "@/types";

const statuses: Record<IdeaStatus, string> = {
	new: "Nueva",
	evaluating: "En evaluación",
	discarded: "Descartada",
	converted: "Convertida",
};

export default function IdeaList({
	ideas,
	onChanged,
	onDeleted,
}: {
	ideas: Idea[];
	onChanged: (idea: Idea) => void;
	onDeleted: (id: string) => void;
}) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState("");

	async function update(
		idea: Idea,
		changes: Partial<Pick<Idea, "content" | "status">>,
	) {
		setBusyId(idea.id);
		const { data, error: updateError } = await createClient()
			.from("ideas")
			.update(changes)
			.eq("id", idea.id)
			.eq("user_id", idea.user_id)
			.select("*")
			.single();
		if (updateError || !data)
			setError("No pudimos actualizar la idea. Inténtalo de nuevo.");
		else {
			onChanged(data as Idea);
			setEditingId(null);
		}
		setBusyId(null);
	}

	async function remove(idea: Idea) {
		if (!window.confirm("¿Eliminar esta idea?")) return;
		const { error: deleteError } = await createClient()
			.from("ideas")
			.delete()
			.eq("id", idea.id)
			.eq("user_id", idea.user_id);
		if (deleteError)
			setError("No pudimos eliminar la idea. Inténtalo de nuevo.");
		else onDeleted(idea.id);
	}

	if (ideas.length === 0)
		return (
			<p className="rounded-box border border-dashed border-base-300 p-6 text-center text-base-content/60">
				Aún no hay ideas.
			</p>
		);
	return (
		<div className="space-y-3">
			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}
			{ideas.map((idea) => (
				<article
					className="rounded-box border border-base-300 bg-base-100 p-4"
					key={idea.id}
				>
					{editingId === idea.id ? (
						<div className="space-y-3">
							<textarea
								className="textarea textarea-bordered w-full"
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								maxLength={4000}
							/>
							<div className="flex gap-2">
								<LoadingButton
									className="btn btn-primary btn-sm"
									onAction={() => {
										const clean = draft.trim();
										if (clean) return update(idea, { content: clean });
										setError("El contenido de la idea es necesario.");
										return Promise.reject(
											new Error("El contenido de la idea es necesario."),
										);
									}}
									pendingLabel="Guardando…"
									onError={() =>
										setError("El contenido de la idea es necesario.")
									}
									disabled={busyId === idea.id}
								>
									Guardar
								</LoadingButton>
								<button
									className="btn btn-ghost btn-sm"
									type="button"
									onClick={() => setEditingId(null)}
									disabled={busyId === idea.id}
								>
									Cancelar
								</button>
							</div>
						</div>
					) : (
						<>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<p className="whitespace-pre-wrap">{idea.content}</p>
								<select
									className="select select-bordered select-sm"
									value={idea.status}
									onChange={(event) =>
										void update(idea, {
											status: event.target.value as IdeaStatus,
										})
									}
									aria-label="Estado de la idea"
								>
									{(Object.keys(statuses) as IdeaStatus[]).map((status) => (
										<option key={status} value={status}>
											{statuses[status]}
										</option>
									))}
								</select>
							</div>
							<div className="mt-3 flex gap-2">
								<button
									className="btn btn-ghost btn-sm"
									type="button"
									onClick={() => {
										setEditingId(idea.id);
										setDraft(idea.content);
									}}
								>
									Editar
								</button>
								<button
									className="btn btn-ghost btn-sm text-error"
									type="button"
									onClick={() => void remove(idea)}
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
