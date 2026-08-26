"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BlockNoteEditor } from "@/components/capture/BlockNoteEditor";
import { Modal, Button } from "@/components/ui";
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
		const [deleteOpen, setDeleteOpen] = useState(false);
		const [deleting, setDeleting] = useState(false);
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
		if (!currentId.current || deleting) return;
		setDeleting(true);
		setError("");
		const { error: deleteError } = await createClient()
			.from("second_brain")
			.delete()
			.eq("id", currentId.current)
			.eq("user_id", userId);
		if (deleteError) {
			setError("No pudimos eliminar la nota.");
			setDeleting(false);
			return;
		}
		setDeleteOpen(false);
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
		<main
			className="note-page"
			aria-busy={saveState === "loading" || saveState === "saving"}
		>
			<header className="note-page-topbar">
				<Link className="note-page-back" href="/second-brain">
					<span aria-hidden="true">←</span> Notas
				</Link>
				<div className="note-page-actions">
					<span
						className={`note-page-status is-${saveState}`}
						role="status"
						aria-live="polite"
					>
						{saveLabel}
					</span>
					{currentId.current && (
						<button
							className="note-page-delete"
							type="button"
							onClick={() => setDeleteOpen(true)}
							disabled={deleting}
						>
							Eliminar
						</button>
					)}
				</div>
			</header>

			<label className="sr-only" htmlFor="note-title">
				Título de la nota
			</label>
			<input
				id="note-title"
				className="note-page-title"
				value={title}
				onChange={(event) => setTitle(event.target.value)}
				placeholder="Sin título"
				maxLength={200}
				autoFocus={entryId === "new"}
			/>

			<div className="note-page-properties">
				<label htmlFor="note-area">
					<span>Área</span>
					<select
						id="note-area"
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
				<label htmlFor="note-tags">
					<span>Etiquetas</span>
					<input
						id="note-tags"
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
			<Modal
				open={deleteOpen}
				onClose={() => {
					if (!deleting) setDeleteOpen(false);
				}}
				title="¿Eliminar esta nota?"
			>
				<p className="py-4 text-sm text-base-content/70">
					Esta acción no se puede deshacer.
				</p>
				{error && (
					<p className="text-sm text-error" role="alert">
						{error}
					</p>
				)}
				<div className="modal-action">
					<Button
						variant="ghost"
						onClick={() => setDeleteOpen(false)}
						disabled={deleting}
					>
						Cancelar
					</Button>
					<Button
						variant="danger"
						onClick={() => void deleteNote()}
						loading={deleting}
					>
						{deleting ? "Eliminando…" : "Eliminar nota"}
					</Button>
				</div>
			</Modal>
			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}
		</main>
	);
}
