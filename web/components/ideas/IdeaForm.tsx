"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/interior/loading-button";
import type { Idea } from "@/types";

export default function IdeaForm({
	areaId,
	onCreated,
}: {
	areaId: string;
	onCreated: (idea: Idea) => void;
}) {
	const [content, setContent] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	async function submit() {
		const cleanContent = content.trim();
		if (!cleanContent) {
			setError("El contenido de la idea es necesario.");
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
		if (insertError || !data)
			setError("No pudimos crear la idea. Inténtalo de nuevo.");
		else {
			onCreated(data as Idea);
			setContent("");
		}
		setSaving(false);
	}

	return (
		<form
			className="space-y-3"
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			<textarea
				className="textarea textarea-bordered min-h-24 w-full"
				placeholder="Captura una idea"
				value={content}
				onChange={(event) => setContent(event.target.value)}
				maxLength={4000}
			/>
			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}
			<LoadingButton
				className="btn btn-primary"
				onAction={submit}
				pendingLabel="Creando…"
				disabled={saving}
			>
				Añadir idea
			</LoadingButton>
		</form>
	);
}
