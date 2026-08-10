"use client";

import { useState } from "react";
import { LoadingButton } from "@/components/interior/loading-button";
import { createClient } from "@/lib/supabase/client";
import type { Idea, IdeaStatus } from "@/types";

const statuses: Record<IdeaStatus, string> = {
	new: "Nueva",
	evaluating: "En evaluación",
	discarded: "Descartada",
	converted: "Convertida",
};

type IdeaListProps = {
	ideas: Idea[];
	onChangedAction: (idea: Idea) => void;
	onDeletedAction: (id: string) => void;
};

export default function IdeaList({
	ideas,
	onChangedAction,
	onDeletedAction,
}: IdeaListProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState("");

	async function update(
		idea: Idea,
		changes: Partial<Pick<Idea, "content" | "status">>,
	) {
		setBusyId(idea.id);
		setError("");
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
			onChangedAction(data as Idea);
			setEditingId(null);
		}
		setBusyId(null);
	}

	async function remove(idea: Idea) {
		if (!window.confirm("¿Eliminar esta idea?")) return;
		setBusyId(idea.id);
		setError("");
		const { error: deleteError } = await createClient()
			.from("ideas")
			.delete()
			.eq("id", idea.id)
			.eq("user_id", idea.user_id);
		if (deleteError)
			setError("No pudimos eliminar la idea. Inténtalo de nuevo.");
		else onDeletedAction(idea.id);
		setBusyId(null);
	}

	if (ideas.length === 0)
		return (
			<p className="idea-empty-state">
				Aún no hay ideas. Guarda una para verla aquí.
			</p>
		);

	return (
		<div className="idea-list">
			{error && (
				<p className="task-form-error" role="alert">
					{error}
				</p>
			)}
			<div className="idea-sticky-grid">
				{ideas.map((idea) => (
					<article
						className={`idea-sticky-card idea-status-${idea.status}`}
						key={idea.id}
					>
						{editingId === idea.id ? (
							<form
								className="idea-sticky-edit"
								onSubmit={(event) => {
									event.preventDefault();
									const clean = draft.trim();
									if (!clean) {
										setError("Escribe algo para guardar la idea.");
										return;
									}
									void update(idea, { content: clean });
								}}
							>
								<textarea
									className="idea-sticky-input"
									value={draft}
									onChange={(event) => setDraft(event.target.value)}
									maxLength={4000}
									aria-label="Editar idea"
								/>
								<div className="idea-card-actions">
									<LoadingButton
										className="idea-sticky-submit"
										onAction={() => update(idea, { content: draft.trim() })}
										pendingLabel="Guardando…"
										disabled={busyId === idea.id || !draft.trim()}
									>
										Guardar
									</LoadingButton>
									<button
										className="idea-text-button"
										type="button"
										onClick={() => setEditingId(null)}
										disabled={busyId === idea.id}
									>
										Cancelar
									</button>
								</div>
							</form>
						) : (
							<>
								<p className="idea-sticky-content">{idea.content}</p>
								<div className="idea-card-footer">
									<select
										className="idea-status-select"
										value={idea.status}
										disabled={busyId === idea.id}
										onChange={(event) =>
											void update(idea, {
												status: event.target.value as IdeaStatus,
											})
										}
										aria-label={`Estado de la idea: ${idea.content}`}
									>
										{(Object.keys(statuses) as IdeaStatus[]).map((status) => (
											<option key={status} value={status}>
												{statuses[status]}
											</option>
										))}
									</select>
									<div className="idea-card-actions">
										<button
											className="idea-text-button"
											type="button"
											onClick={() => {
												setEditingId(idea.id);
												setDraft(idea.content);
											}}
											disabled={busyId === idea.id}
										>
											Editar
										</button>
										<button
											className="idea-text-button idea-delete-button"
											type="button"
											onClick={() => void remove(idea)}
											disabled={busyId === idea.id}
										>
											Eliminar
										</button>
									</div>
								</div>
							</>
						)}
					</article>
				))}
			</div>
		</div>
	);
}
