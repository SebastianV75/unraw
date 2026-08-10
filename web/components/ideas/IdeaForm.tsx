"use client";

import { useState } from "react";
import { LoadingButton } from "@/components/interior/loading-button";
import { createClient } from "@/lib/supabase/client";
import type { Idea } from "@/types";

type IdeaFormProps = {
	areaId: string;
	onCreatedAction: (idea: Idea) => void;
};

export default function IdeaForm({ areaId, onCreatedAction }: IdeaFormProps) {
	const [content, setContent] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	async function submit() {
		const cleanContent = content.trim();
		if (!cleanContent) {
			setError("Escribe algo para guardar la idea.");
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
			.from("ideas")
			.insert({
				user_id: user.id,
				area_id: areaId,
				content: cleanContent,
				status: "new",
			})
			.select("*")
			.single();
		if (insertError || !data) {
			setError("No pudimos guardar la idea. Inténtalo de nuevo.");
		} else {
			onCreatedAction(data as Idea);
			setContent("");
		}
		setSaving(false);
	}

	return (
		<div className="idea-capture">
			<form
				className="idea-sticky-form"
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<textarea
					className="idea-sticky-input"
					placeholder="Escribe una idea…"
					value={content}
					onChange={(event) => setContent(event.target.value)}
					maxLength={4000}
					aria-label="Contenido de la idea"
					onKeyDown={(event) => {
						if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
							event.preventDefault();
							void submit();
						}
					}}
				/>
				<div className="idea-sticky-footer">
					<span>Una posibilidad · Ctrl/Cmd + Enter para guardar</span>
					<LoadingButton
						className="idea-sticky-submit"
						onAction={submit}
						pendingLabel="Guardando…"
						disabled={saving || !content.trim()}
					>
						Guardar idea
					</LoadingButton>
				</div>
			</form>
			{error && (
				<p className="task-form-error" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
