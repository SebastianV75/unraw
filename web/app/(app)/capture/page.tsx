"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaptureReviewPanel } from "@/components/capture/CaptureReviewPanel";
import { MarkdownEditor } from "@/components/capture/MarkdownEditor";
import { LoadingButton } from "@/components/interior/loading-button";
import {
	CAPTURE_DRAFT_VERSION,
	CAPTURE_DRAFT_KEY,
	readCaptureDraft,
	writeCaptureDraft,
	clearCaptureDraft,
} from "@/lib/captures/draft";
import { parseSaveCaptureResult } from "@/lib/captures/receipt";
import { runSingleFlight } from "@/lib/captures/single-flight";
import {
	createIdempotencyKey,
	resolveIdempotencyKey,
} from "@/lib/captures/idempotency";
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
	const [assignedAreas, setAssignedAreas] = useState<
		Record<string, string | null>
	>({});
	const [rejectedItems, setRejectedItems] = useState<Record<string, boolean>>(
		{},
	);
	const [editingItem, setEditingItem] = useState<string | null>(null);
	const [editedValues, setEditedValues] = useState<Record<string, string>>({});
	const [projectAreas, setProjectAreas] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [idempotencyKey, setIdempotencyKey] = useState("");
	const [draftReady, setDraftReady] = useState(false);
	const processFlight = useRef<Promise<void> | null>(null);
	const saveFlight = useRef<Promise<void> | null>(null);
	const captureKeyRawNote = useRef<string | null>(null);

	useEffect(() => {
		const draft = readCaptureDraft(sessionStorage.getItem(CAPTURE_DRAFT_KEY));
		if (draft) {
			setRawNote(draft.rawNote);
			setIdempotencyKey(draft.idempotencyKey);
			captureKeyRawNote.current = draft.idempotencyKey ? draft.rawNote : null;
			setResult(draft.result);
			setApproved(draft.approved);
			setAssignedAreas(draft.assignedAreas);
			setRejectedItems(draft.rejectedItems);
			setEditedValues(draft.editedValues);
			setProjectAreas(draft.projectAreas);
		}
		setDraftReady(true);
	}, []);

	useEffect(() => {
		if (!draftReady) return;
		if (!rawNote.trim()) {
			clearCaptureDraft();
			return;
		}
		const draftKey =
			idempotencyKey && captureKeyRawNote.current !== rawNote
				? resolveIdempotencyKey(
						idempotencyKey,
						captureKeyRawNote.current,
						rawNote,
					)
				: idempotencyKey;
		if (draftKey !== idempotencyKey) setIdempotencyKey(draftKey);
		if (draftKey) captureKeyRawNote.current = rawNote;
		writeCaptureDraft({
			version: CAPTURE_DRAFT_VERSION,
			rawNote,
			idempotencyKey: draftKey,
			result,
			approved,
			assignedAreas,
			rejectedItems,
			editedValues,
			projectAreas,
		});
	}, [
		draftReady,
		rawNote,
		idempotencyKey,
		result,
		approved,
		assignedAreas,
		rejectedItems,
		editedValues,
		projectAreas,
	]);

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

	async function process(preserveCaptureKey = false): Promise<void> {
		return runSingleFlight(processFlight, async () => {
			if (rawNote.trim().length < 1 || rawNote.trim().length > 12000) {
				setError("Escribe una nota de entre 1 y 12,000 caracteres.");
				return;
			}
			if (
				!preserveCaptureKey ||
				captureKeyRawNote.current !== rawNote ||
				!idempotencyKey
			) {
				setIdempotencyKey(createIdempotencyKey());
				captureKeyRawNote.current = rawNote;
			}
			setProcessing(true);
			setError("");
			setSuccess("");
			setResult(null);
			try {
				const response = await fetch("/api/ai/process-note", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						raw_note: rawNote,
						timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
					}),
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
				throw caught;
			} finally {
				setProcessing(false);
			}
		});
	}

	const selectedArea = (
		kind: string,
		index: number,
		fallback: string | null,
	) =>
		Object.prototype.hasOwnProperty.call(assignedAreas, `${kind}:${index}`)
			? assignedAreas[`${kind}:${index}`]
			: fallback;

	async function saveResults(): Promise<void> {
		if (!result) return;
		return runSingleFlight(saveFlight, async () => {
			setSaving(true);
			setError("");
			setSuccess("");
			try {
				const assignments: Record<string, string | null> = {};
				const tasks = result.tasks
					.map((item, index) => ({ item, index }))
					.filter(({ index }) => !rejectedItems[`task:${index}`]);
				const ideas = result.ideas
					.map((item, index) => ({ item, index }))
					.filter(({ index }) => !rejectedItems[`idea:${index}`]);
				const secondBrain = result.second_brain
					.map((item, index) => ({ item, index }))
					.filter(({ index }) => !rejectedItems[`knowledge:${index}`]);
				const approvedSuggestionCount = suggestions.filter((item) =>
					Boolean(approved[suggestionKey(item)]),
				).length;
				const fallbackToInbox =
					result.tasks.length === 0 &&
					result.ideas.length === 0 &&
					result.second_brain.length === 0;
				if (
					tasks.length === 0 &&
					ideas.length === 0 &&
					secondBrain.length === 0 &&
					approvedSuggestionCount === 0 &&
					!fallbackToInbox
				) {
					throw new Error(
						"Selecciona al menos un elemento o una sugerencia para guardar.",
					);
				}

				tasks.forEach(({ item, index }, outputIndex) => {
					assignments[`task:${outputIndex}`] = selectedArea(
						"task",
						index,
						item.area_id,
					);
					assignments[`task-project:${outputIndex}`] = item.project_id;
				});
				ideas.forEach(({ item, index }, outputIndex) => {
					assignments[`idea:${outputIndex}`] = selectedArea(
						"idea",
						index,
						item.area_id,
					);
				});
				secondBrain.forEach(({ item, index }, outputIndex) => {
					assignments[`knowledge:${outputIndex}`] = selectedArea(
						"knowledge",
						index,
						item.area_id,
					);
				});
				suggestions.forEach((item) => {
					if (!approved[suggestionKey(item)]) return;
					assignments[`suggestion:${item.type}:${item.name.toLowerCase()}`] =
						"00000000-0000-0000-0000-000000000000";
					if (item.type === "new_project")
						assignments[
							`suggestion-area:${item.type}:${item.name.toLowerCase()}`
						] = projectAreas[suggestionKey(item)] || item.area_id || null;
				});

				const key = resolveIdempotencyKey(
					idempotencyKey,
					captureKeyRawNote.current,
					rawNote,
				);
				setIdempotencyKey(key);
				captureKeyRawNote.current = rawNote;
				writeCaptureDraft({
					version: CAPTURE_DRAFT_VERSION,
					rawNote,
					idempotencyKey: key,
					result,
					approved,
					assignedAreas,
					rejectedItems,
					editedValues,
					projectAreas,
				});
				const response = await fetch("/api/captures/save", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						idempotency_key: key,
						raw_note: rawNote,
						confirmed_output: {
							...result,
							tasks: tasks.map(({ item }) => item),
							ideas: ideas.map(({ item }) => item),
							second_brain: secondBrain.map(({ item }) => item),
							suggestions,
						},
						assignments,
						fallback_to_inbox: fallbackToInbox,
					}),
				});
				const body: unknown = await response.json();
				if (!response.ok) {
					const message =
						body && typeof body === "object" && "error" in body
							? String(body.error)
							: "No pudimos guardar la captura.";
					throw new Error(message);
				}
				const receipt = parseSaveCaptureResult(body);
				const inboxMessage =
					receipt.inbox_item_ids.length === 0
						? "No quedó nada pendiente en Inbox."
						: `${receipt.inbox_item_ids.length} elemento(s) quedaron en Inbox.`;
				setSuccess(
					`${receipt.existing ? "La captura ya estaba guardada." : "Captura guardada."} ${inboxMessage} Recibo: ${receipt.batch_id}`,
				);
				setResult(null);
				setRawNote("");
				setIdempotencyKey("");
				captureKeyRawNote.current = null;
				clearCaptureDraft();
			} catch (caught) {
				setError(
					caught instanceof Error
						? caught.message
						: "No pudimos guardar la captura.",
				);
				throw caught;
			} finally {
				setSaving(false);
			}
		});
	}

	function saveEdit(kind: string, index: number) {
		const key = `${kind}:${index}`;
		const value = editedValues[key]?.trim();
		if (!value || !result) return;
		if (kind === "task") {
			setResult({
				...result,
				tasks: result.tasks.map((item, itemIndex) =>
					itemIndex === index ? { ...item, title: value } : item,
				),
			});
		} else if (kind === "idea") {
			setResult({
				...result,
				ideas: result.ideas.map((item, itemIndex) =>
					itemIndex === index ? { ...item, content: value } : item,
				),
			});
		} else {
			setResult({
				...result,
				second_brain: result.second_brain.map((item, itemIndex) =>
					itemIndex === index ? { ...item, title: value } : item,
				),
			});
		}
		setEditingItem(null);
	}

	const areaNames = new Map(areas.map((area) => [area.id, area.name]));
	const projectNames = new Map(
		projects.map((project) => [project.id, project.name]),
	);

	return (
		<div className={`capture-workspace ${result ? "has-result" : "is-empty"}`}>
			<div className="capture-minimal-shell">
				<form
					className="capture-minimal-form"
					onSubmit={(event) => {
						event.preventDefault();
						void process().catch(() => undefined);
					}}
				>
					<MarkdownEditor
						value={rawNote}
						onChangeAction={setRawNote}
						maxLength={12000}
						disabled={processing}
						variant="minimal"
						autoFocus={!result}
					/>
					<div className="capture-minimal-actions">
						<span className="sr-only">
							Ordenaremos tu captura después de enviarla.
						</span>
						<LoadingButton
							className="capture-process-action"
							onAction={process}
							pendingLabel="Ordenando…"
							disabled={loading || !rawNote.trim()}
						>
							Ordenar
						</LoadingButton>
					</div>
				</form>
				{processing && (
					<p className="capture-ai-status" role="status" aria-live="polite">
						Estamos ordenando tu captura…
					</p>
				)}
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
					<CaptureReviewPanel
						result={result}
						areas={areas}
						areaNames={areaNames}
						projectNames={projectNames}
						suggestions={suggestions}
						approved={approved}
						assignedAreas={assignedAreas}
						rejectedItems={rejectedItems}
						editingItem={editingItem}
						editedValues={editedValues}
						projectAreas={projectAreas}
						saving={saving}
						onAssignedAreaChange={(kind, index, value) =>
							setAssignedAreas((current) => ({
								...current,
								[`${kind}:${index}`]: value,
							}))
						}
						onApprove={(key, checked) =>
							setApproved((current) => ({ ...current, [key]: checked }))
						}
						onProjectAreaChange={(key, value) =>
							setProjectAreas((current) => ({ ...current, [key]: value }))
						}
						onBeginEdit={(kind, index, value) => {
							const key = `${kind}:${index}`;
							setEditedValues((current) => ({ ...current, [key]: value }));
							setEditingItem(key);
						}}
						onEditedValueChange={(key, value) =>
							setEditedValues((current) => ({ ...current, [key]: value }))
						}
						onSaveEdit={saveEdit}
						onCancelEdit={() => setEditingItem(null)}
						onReject={(key) =>
							setRejectedItems((current) => ({ ...current, [key]: true }))
						}
						onSave={saveResults}
						onRetry={() => process(true)}
					/>
				)}
			</div>
		</div>
	);
}
