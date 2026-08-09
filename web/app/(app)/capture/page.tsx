"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import ArrowLeft4 from "reicon-react/icons/ArrowLeft4";
import BookSaved from "reicon-react/icons/BookSaved";
import Check3 from "reicon-react/icons/Check3";
import DocumentText from "reicon-react/icons/DocumentText";
import Bulb from "reicon-react/icons/Bulb";
import ListCheck from "reicon-react/icons/ListCheck";
import More from "reicon-react/icons/More";
import type { IconComponent } from "reicon-react/createIcon";
import { MarkdownEditor } from "@/components/capture/MarkdownEditor";
import { MarkdownRenderer } from "@/components/capture/MarkdownRenderer";
import { LoadingButton } from "@/components/interior/loading-button";
import { ShowMore } from "@/components/interior/show-more";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import { createClient } from "@/lib/supabase/client";
import type { Area, CaptureOutput, CaptureSuggestion, Project } from "@/types";

const suggestionKey = (suggestion: CaptureSuggestion) =>
	`${suggestion.type}:${suggestion.name.toLowerCase()}`;

export default function CapturePage() {
	const [rawNote, setRawNote] = useState("");
	const [areas, setAreas] = useState<Area[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [result, setResult] = useState<CaptureOutput | null>(null);
	const [approved, setApproved] = useState<Record<string, boolean>>({});
	const [assignedAreas, setAssignedAreas] = useState<Record<string, string | null>>({});
	const [rejectedItems, setRejectedItems] = useState<Record<string, boolean>>({});
	const [editingItem, setEditingItem] = useState<string | null>(null);
	const [editedValues, setEditedValues] = useState<Record<string, string>>({});
	const [projectAreas, setProjectAreas] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [idempotencyKey, setIdempotencyKey] = useState("");

	useEffect(() => {
		const draft = sessionStorage.getItem("unraw-capture-draft");
		if (draft) setRawNote(draft);
	}, []);

	useEffect(() => {
		if (rawNote) sessionStorage.setItem("unraw-capture-draft", rawNote);
	}, [rawNote]);

	useEffect(() => {
		async function loadContext() {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setError("Tu sesión expiró. Inicia sesión de nuevo.");
				setLoading(false);
				return;
			}
			const [areaResult, projectResult] = await Promise.all([
				supabase.from("areas").select("*").eq("user_id", user.id).order("name"),
				supabase
					.from("projects")
					.select("*")
					.eq("user_id", user.id)
					.order("name"),
			]);
			if (areaResult.error || projectResult.error)
				setError("No pudimos cargar el contexto de tu sistema.");
			setAreas((areaResult.data ?? []) as Area[]);
			setProjects((projectResult.data ?? []) as Project[]);
			setLoading(false);
		}
		void loadContext();
	}, []);

	const suggestions = useMemo(() => {
		if (!result) return [];
		const all = [...result.suggestions];
		result.tasks.forEach((item) => {
			if (item.suggested_new_area)
				all.push({
					type: "new_area",
					name: item.suggested_new_area,
					reason: "Una tarea no encaja en un área existente.",
				});
			if (item.suggested_new_project)
				all.push({
					type: "new_project",
					name: item.suggested_new_project,
					reason: "Una tarea no encaja en un proyecto existente.",
					area_id: item.area_id,
				});
		});
		result.ideas.forEach((item) => {
			if (item.suggested_new_area)
				all.push({
					type: "new_area",
					name: item.suggested_new_area,
					reason: "Una idea no encaja en un área existente.",
				});
		});
		result.second_brain.forEach((item) => {
			if (item.suggested_new_area)
				all.push({
					type: "new_area",
					name: item.suggested_new_area,
					reason: "Una nota no encaja en un área existente.",
				});
		});
		return Array.from(
			new Map(all.map((item) => [suggestionKey(item), item])).values(),
		);
	}, [result]);

	async function process() {
		if (rawNote.trim().length < 1 || rawNote.trim().length > 12000) {
			setError("Escribe una nota de entre 1 y 12,000 caracteres.");
			return;
		}
		setProcessing(true);
		setError("");
		setSuccess("");
		setResult(null);
		try {
			const response = await fetch("/api/ai/process-note", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ raw_note: rawNote }),
			});
			const body = (await response.json()) as CaptureOutput & {
				error?: string;
			};
			if (!response.ok)
				throw new Error(body.error || "No pudimos procesar la nota.");
			setResult(body);
				setApproved({});
				setAssignedAreas({});
				setRejectedItems({});
				setEditingItem(null);
				setEditedValues({});
			setProjectAreas({});
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "No pudimos procesar la nota.",
			);
		}
		setProcessing(false);
	}

		async function saveResults() {
			if (!result) return;
		setSaving(true);
		setError("");
		setSuccess("");
			try {
				const assignments: Record<string, string | null> = {};
				const confirmedSuggestions = suggestions;
					const tasks = result.tasks.map((item, index) => ({ item, index })).filter(({ index }) => !rejectedItems[`task:${index}`]);
					const ideas = result.ideas.map((item, index) => ({ item, index })).filter(({ index }) => !rejectedItems[`idea:${index}`]);
					const secondBrain = result.second_brain.map((item, index) => ({ item, index })).filter(({ index }) => !rejectedItems[`knowledge:${index}`]);
					tasks.forEach(({ item, index }, outputIndex) => { assignments[`task:${outputIndex}`] = selectedArea("task", index, item.area_id); assignments[`task-project:${outputIndex}`] = item.project_id; });
					ideas.forEach(({ item, index }, outputIndex) => { assignments[`idea:${outputIndex}`] = selectedArea("idea", index, item.area_id); });
					secondBrain.forEach(({ item, index }, outputIndex) => { assignments[`knowledge:${outputIndex}`] = selectedArea("knowledge", index, item.area_id); });
				confirmedSuggestions.forEach((item) => { if (approved[suggestionKey(item)]) { assignments[`suggestion:${item.type}:${item.name.toLowerCase()}`] = "00000000-0000-0000-0000-000000000000"; if (item.type === "new_project") assignments[`suggestion-area:${item.type}:${item.name.toLowerCase()}`] = projectAreas[suggestionKey(item)] || item.area_id || null; } });
				const key = idempotencyKey || crypto.randomUUID(); setIdempotencyKey(key);
				const response = await fetch("/api/captures/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotency_key: key, raw_note: rawNote, confirmed_output: { ...result, tasks: tasks.map(({ item }) => item), ideas: ideas.map(({ item }) => item), second_brain: secondBrain.map(({ item }) => item), suggestions: confirmedSuggestions }, assignments }) });
			const body = await response.json() as { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos guardar la captura.");
			setSuccess("Elementos confirmados guardados. Lo que no tenga destino está en Inbox."); setResult(null); setRawNote(""); setIdempotencyKey(""); sessionStorage.removeItem("unraw-capture-draft");
		} catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar la captura."); }
		setSaving(false);
	}

	const areaNames = new Map(areas.map((area) => [area.id, area.name]));
	const projectNames = new Map(
		projects.map((project) => [project.id, project.name]),
	);
	const selectedArea = (kind: string, index: number, fallback: string | null) => Object.prototype.hasOwnProperty.call(assignedAreas, `${kind}:${index}`) ? assignedAreas[`${kind}:${index}`] : fallback;
	const areaSelect = (kind: string, index: number, current: string | null) => <select className="select select-bordered select-xs mt-2" value={selectedArea(kind, index, current) ?? ""} onChange={(event) => setAssignedAreas((areas) => ({ ...areas, [`${kind}:${index}`]: event.target.value || null }))} aria-label={`Asignar ${kind} ${index + 1} a un área`}><option value="">Sin destino todavía</option>{areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select>;
	const editKey = (kind: string, index: number) => `${kind}:${index}`;
	const beginEdit = (kind: string, index: number, value: string) => { setEditedValues((current) => ({ ...current, [editKey(kind, index)]: value })); setEditingItem(editKey(kind, index)); };
	const saveEdit = (kind: string, index: number) => {
		const key = editKey(kind, index);
		const value = editedValues[key]?.trim();
		if (!value || !result) return;
		setResult({ ...result, [kind === "task" ? "tasks" : kind === "idea" ? "ideas" : "second_brain"]: (kind === "task" ? result.tasks : kind === "idea" ? result.ideas : result.second_brain).map((item, itemIndex) => itemIndex === index ? (kind === "task" ? { ...item, title: value } : kind === "idea" ? { ...item, content: value } : { ...item, title: value }) : item) } as CaptureOutput);
		setEditingItem(null);
	};
	const reviewControls = (kind: string, index: number, value: string) => {
		const key = editKey(kind, index);
		if (rejectedItems[key]) return <p className="mt-3 text-sm text-base-content/60">Descartado; este elemento no se guardará.</p>;
		if (editingItem === key) return <div className="mt-3 space-y-2"><label className="sr-only" htmlFor={`edit-${key}`}>Editar {kind} {index + 1}</label><textarea id={`edit-${key}`} className="textarea textarea-bordered w-full" value={editedValues[key] ?? value} onChange={(event) => setEditedValues((current) => ({ ...current, [key]: event.target.value }))} /><div className="flex gap-2"><button type="button" className="btn btn-primary btn-xs" onClick={() => saveEdit(kind, index)}>Guardar edición</button><button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditingItem(null)}>Cancelar</button></div></div>;
		return <div className="mt-3 flex gap-2"><button type="button" className="btn btn-ghost btn-xs" onClick={() => beginEdit(kind, index, value)}>Editar elemento</button><button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => setRejectedItems((current) => ({ ...current, [key]: true }))}>Rechazar elemento</button></div>;
	};
	const resultCount = result
		? result.tasks.length + result.ideas.length + result.second_brain.length
		: 0;
	return (
		<div className="capture-document -mx-4 -my-4 min-h-[calc(100vh-2rem)] px-5 py-4 md:-mx-8 md:-my-8 md:px-10 md:py-6">
			<div className="capture-document-topbar">
				<div className="flex min-w-0 items-center gap-3">
					<Link
						className="capture-document-back"
						href="/overview"
						aria-label="Volver al resumen"
					>
						<ArrowLeft4 size={15} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
						<span>Resumen</span>
					</Link>
					<span className="capture-document-divider">/</span>
					<span className="truncate">Capturar</span>
				</div>
				<div className="capture-document-context">
					<DocumentText size={14} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
					Markdown
				</div>
				<div className="flex items-center gap-3">
					<button
						className="capture-document-menu"
						type="button"
						aria-label="Más opciones de nota"
					>
						<More size={17} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
					</button>
				</div>
			</div>
			<div className="capture-document-content">
				<header className="capture-note-heading">
					<p className="capture-note-kicker">Captura rápida</p>
					<h1>Captura una idea</h1>
					<p>Escríbelo tal como aparece. Unraw te ayuda con el siguiente paso.</p>
				</header>
				<form className="capture-note-form" onSubmit={(event) => { event.preventDefault(); void process(); }}>
					<MarkdownEditor
						value={rawNote}
						onChangeAction={setRawNote}
						maxLength={12000}
						disabled={processing}
						variant="document"
					/>
					<div className="capture-note-actions">
						<p>Tu Markdown se envía al organizador sin cambios.</p>
						<LoadingButton
							className="capture-primary-action"
							onAction={process}
							pendingLabel="Procesando…"
							disabled={loading || !rawNote.trim()}
						>
							Procesar con IA
						</LoadingButton>
					</div>
				</form>
				<SkeletonSwap ready={!loading} lines={2} reserve={40} label="Contexto del sistema" skeleton={<p className="capture-loading">Cargando tus áreas y proyectos…</p>}>
					<span className="sr-only">Contexto del sistema cargado.</span>
				</SkeletonSwap>
				{error && (
					<p className="capture-alert capture-alert-error" role="alert">
						{error}
					</p>
				)}
				{success && (
					<p className="capture-alert capture-alert-success" role="status">
						{success}
					</p>
				)}
				{result && (
					<div className="capture-result-area">
						<section className="capture-result-summary" aria-live="polite">
							<div>
								<Check3 size={16} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
								<span className="capture-result-summary-label">Resumen listo</span>
								<strong>
									{resultCount} {resultCount === 1 ? "elemento listo" : "elementos listos"}
								</strong>
							</div>
						</section>
						<ShowMore moreLabel="Revisar detalles" lessLabel="Ocultar detalles" label="Detalles del resumen" lines={2} maxHeight={900} className="mt-3">
							<div className="capture-results-wrapper space-y-6">
								<section className="capture-results-grid grid gap-4 md:grid-cols-3">
									<CaptureGroup title="Tareas" icon={ListCheck}>
										{result.tasks.map((item, index) => (
											<article
												className="capture-result-card rounded-box border p-4"
												key={`${item.title}-${index}`}
											>
															<MarkdownRenderer content={item.title} compact />
												<p className="mt-2 text-xs text-base-content/60">
													{areaNames.get(item.area_id ?? "") ??
														item.suggested_new_area ??
														"Sin área todavía"}
														{item.project_id && projectNames.get(item.project_id)
														? ` / ${projectNames.get(item.project_id)}`
														: item.suggested_new_project
															? ` / ${item.suggested_new_project}`
															: ""}
															</p>
																{areaSelect("task", index, item.area_id)}
																{reviewControls("task", index, item.title)}
											</article>
										))}
									</CaptureGroup>
									<CaptureGroup title="Ideas" icon={Bulb}>
										{result.ideas.map((item, index) => (
											<article
												className="capture-result-card rounded-box border p-4"
												key={`${item.content}-${index}`}
											>
												<MarkdownRenderer content={item.content} />
												<p className="mt-2 text-xs text-base-content/60">
													{areaNames.get(item.area_id ?? "") ??
														item.suggested_new_area ??
														"Sin área todavía"}
															</p>
																{areaSelect("idea", index, item.area_id)}
																{reviewControls("idea", index, item.content)}
											</article>
										))}
									</CaptureGroup>
									<CaptureGroup title="Conocimiento" icon={BookSaved}>
										{result.second_brain.map((item, index) => (
											<article
												className="capture-result-card rounded-box border p-4"
												key={`${item.title}-${index}`}
											>
												<MarkdownRenderer
													content={`## ${item.title}\n\n${item.content}`}
												/>
												<p className="mt-2 text-xs text-base-content/60">
													{areaNames.get(item.area_id ?? "") ??
														item.suggested_new_area ??
														"Sin área todavía"}
															</p>
																{areaSelect("knowledge", index, item.area_id)}
																{reviewControls("knowledge", index, item.title)}
											</article>
										))}
									</CaptureGroup>
								</section>
								{suggestions.length > 0 && (
									<section className="capture-suggestions space-y-4 rounded-box border p-5">
										<div>
											<h2 className="text-xl font-semibold">
												Sugerencias para revisar
											</h2>
											<p className="mt-1 text-sm text-base-content/70">
Nada se crea automáticamente. Confirma solo lo que
												quieras incorporar a tu sistema.
											</p>
										</div>
										{suggestions.map((suggestion) => (
											<div
												className="capture-suggestion-row flex flex-col gap-3 rounded-box border p-4 sm:flex-row sm:items-center"
												key={suggestionKey(suggestion)}
											>
												<label className="flex flex-1 gap-3">
													<input
														className="checkbox checkbox-primary mt-1"
														type="checkbox"
														checked={Boolean(
															approved[suggestionKey(suggestion)],
														)}
														onChange={(event) =>
															setApproved((current) => ({
																...current,
																[suggestionKey(suggestion)]:
																	event.target.checked,
															}))
														}
													/>
													<span>
														<strong>{suggestion.name}</strong>
														<span className="block text-sm text-base-content/60">
															{suggestion.reason}
														</span>
													</span>
												</label>
												{suggestion.type === "new_project" && (
													<select
														className="select select-bordered select-sm"
														value={
															projectAreas[suggestionKey(suggestion)] ??
															suggestion.area_id ??
															""
														}
														onChange={(event) =>
															setProjectAreas((current) => ({
																...current,
																[suggestionKey(suggestion)]: event.target.value,
															}))
														}
														aria-label={`Área para ${suggestion.name}`}
													>
														<option value="">Elegir área</option>
														{areas.map((area) => (
															<option value={area.id} key={area.id}>
																{area.name}
															</option>
														))}
													</select>
												)}
											</div>
										))}
									</section>
								)}
								<div className="flex justify-end">
									<LoadingButton
										className="capture-primary-action"
										onAction={saveResults}
										disabled={saving}
										pendingLabel="Guardando…"
									>
										Guardar elementos confirmados
									</LoadingButton>
								</div>
							</div>
						</ShowMore>
					</div>
				)}
			</div>
		</div>
	);
}

function CaptureGroup({
	title,
	icon,
	children,
}: {
	title: string;
	icon: IconComponent;
	children: ReactNode;
}) {
	const Icon = icon;
	return (
		<section className="capture-group space-y-3 rounded-box p-4 shadow-sm">
			<h2 className="text-xl font-semibold">
				<Icon size={17} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
				<span>{title}</span>
			</h2>
			<div className="space-y-3">
				{children || (
					<p className="text-sm text-base-content/60">No encontramos elementos.</p>
				)}
			</div>
		</section>
	);
}
