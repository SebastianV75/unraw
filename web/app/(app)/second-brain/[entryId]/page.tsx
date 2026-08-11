"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BlockNoteEditor } from "@/components/capture/BlockNoteEditor";
import { createClient } from "@/lib/supabase/client";
import type { Area, SecondBrainEntry } from "@/types";

type SaveState = "loading" | "saved" | "saving" | "unsaved" | "error";

export default function KnowledgeNotePage() {
	const params = useParams<{ entryId: string }>();
	const router = useRouter();
	const entryId = params.entryId;
	const currentId = useRef(entryId === "new" ? null : entryId);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [userId, setUserId] = useState("");
	const [areas, setAreas] = useState<Area[]>([]);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [tags, setTags] = useState("");
	const [areaId, setAreaId] = useState("");
	const [ready, setReady] = useState(false);
	const [saveState, setSaveState] = useState<SaveState>("loading");
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function load() {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setError("Tu sesión ha caducado. Vuelve a iniciar sesión.");
				setSaveState("error");
				setReady(true);
				return;
			}
			setUserId(user.id);

			const areaResult = await supabase
				.from("areas")
				.select("*")
				.eq("user_id", user.id)
				.order("name");
			if (!cancelled) setAreas((areaResult.data ?? []) as Area[]);

			if (entryId !== "new") {
				const { data, error: entryError } = await supabase
					.from("second_brain")
					.select("*")
					.eq("id", entryId)
					.eq("user_id", user.id)
					.single();
				if (entryError || !data) {
					if (!cancelled) {
						setError("No encontramos esta nota.");
						setSaveState("error");
					}
				} else if (!cancelled) {
					const entry = data as SecondBrainEntry;
					currentId.current = entry.id;
					setTitle(entry.title);
					setContent(entry.content);
					setTags(entry.tags.join(", "));
					setAreaId(entry.area_id ?? "");
					setSaveState("saved");
				}
			} else if (!cancelled) {
				setSaveState("unsaved");
			}
			if (!cancelled) setReady(true);
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, [entryId]);

	useEffect(() => {
		if (!ready || !userId || (!title.trim() && !content.trim())) return;
		if (timer.current) clearTimeout(timer.current);
		setSaveState("unsaved");
		timer.current = setTimeout(async () => {
			setSaveState("saving");
			const cleanTags = tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean)
				.slice(0, 20);
			const payload = {
				area_id: areaId || null,
				title: title.trim() || "Sin título",
				content: content.trim(),
				tags: cleanTags,
			};
			const supabase = createClient();
			const result = currentId.current
				? await supabase
						.from("second_brain")
						.update(payload)
						.eq("id", currentId.current)
						.eq("user_id", userId)
						.select("id")
						.single()
				: await supabase
						.from("second_brain")
						.insert({ user_id: userId, ...payload })
						.select("id")
						.single();

			if (result.error || !result.data) {
				setError("No pudimos guardar la nota.");
				setSaveState("error");
				return;
			}
			setError("");
			setSaveState("saved");
			if (!currentId.current) {
				currentId.current = result.data.id;
				router.replace(`/second-brain/${result.data.id}`);
			}
		}, 900);

		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, [areaId, content, ready, router, tags, title, userId]);

	async function deleteNote() {
		if (!currentId.current || !window.confirm("¿Eliminar esta nota?")) return;
		const { error: deleteError } = await createClient()
			.from("second_brain")
			.delete()
			.eq("id", currentId.current)
			.eq("user_id", userId);
		if (deleteError) {
			setError("No pudimos eliminar la nota.");
			return;
		}
		router.replace("/second-brain");
	}

	const saveLabel = {
		loading: "Cargando…",
		saved: "Guardado",
		saving: "Guardando…",
		unsaved: "Cambios sin guardar",
		error: "No se pudo guardar",
	}[saveState];

	if (!ready)
		return (
			<main className="note-page">
				<p className="note-page-status">Cargando nota…</p>
			</main>
		);

	return (
		<main className="note-page">
			<header className="note-page-topbar">
				<Link className="note-page-back" href="/second-brain">
					<span aria-hidden="true">←</span> Notas
				</Link>
				<div className="note-page-actions">
					<span className={`note-page-status is-${saveState}`} role="status">
						{saveLabel}
					</span>
					{currentId.current && (
						<button
							className="note-page-delete"
							type="button"
							onClick={deleteNote}
						>
							Eliminar
						</button>
					)}
				</div>
			</header>

			<input
				className="note-page-title"
				value={title}
				onChange={(event) => setTitle(event.target.value)}
				placeholder="Sin título"
				maxLength={200}
				autoFocus={entryId === "new"}
			/>

			<div className="note-page-properties">
				<label>
					<span>Área</span>
					<select
						value={areaId}
						onChange={(event) => setAreaId(event.target.value)}
					>
						<option value="">Global</option>
						{areas.map((area) => (
							<option value={area.id} key={area.id}>
								{area.name}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>Etiquetas</span>
					<input
						value={tags}
						onChange={(event) => setTags(event.target.value)}
						placeholder="Añadir etiquetas"
						maxLength={500}
					/>
				</label>
			</div>
			<div className="note-page-editor">
				<BlockNoteEditor
					value={content}
					onChangeAction={setContent}
					maxLength={10000}
					autoFocus={entryId === "new"}
				/>
			</div>
			<p className="note-page-hint">
				Escribe `/` para insertar un bloque. Arrastra para reordenar.
			</p>
			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}
		</main>
	);
}
