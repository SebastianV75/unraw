import BookSaved from "reicon-react/icons/BookSaved";
import Bulb from "reicon-react/icons/Bulb";
import Check3 from "reicon-react/icons/Check3";
import ListCheck from "reicon-react/icons/ListCheck";
import type { IconComponent } from "reicon-react/createIcon";
import { useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "@/components/capture/MarkdownRenderer";
import { LoadingButton } from "@/components/interior/loading-button";
import { ShowMore } from "@/components/interior/show-more";
import {
	getCaptureReviewAttention,
	getCaptureReviewState,
	type CaptureUndoToken,
} from "@/lib/captures/review-state";
import type { CaptureEditedFields } from "@/lib/captures/draft";
import type { Area, CaptureOutput, CaptureSuggestion, Project } from "@/types";

function suggestionKey(suggestion: CaptureSuggestion) {
	return `${suggestion.type}:${suggestion.name.toLowerCase()}`;
}

function formatTaskDue(dueDate: string | null, dueAt: string | null) {
	if (dueAt) {
		return `Vence ${new Intl.DateTimeFormat("es", {
			day: "numeric",
			month: "short",
			hour: "numeric",
			minute: "2-digit",
		}).format(new Date(dueAt))}`;
	}
	if (dueDate) {
		return `Vence ${new Intl.DateTimeFormat("es", {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(new Date(`${dueDate}T12:00:00`))}`;
	}
	return null;
}

type ReviewProps = {
	result: CaptureOutput;
	areas: Area[];
	projects: Project[];
	areaNames: Map<string, string>;
	projectNames: Map<string, string>;
	suggestions: CaptureSuggestion[];
	approved: Record<string, boolean>;
	assignedAreas: Record<string, string | null>;
	assignedProjects: Record<string, string | null>;
	rejectedItems: Record<string, boolean>;
	editingItem: string | null;
	editedValues: Record<string, string>;
	editedFields: Record<string, CaptureEditedFields>;
	projectAreas: Record<string, string>;
	saving: boolean;
	canSave: boolean;
	saveError: string;
	undoToken: CaptureUndoToken | null;
	onAssignedAreaChange: (kind: string, index: number, value: string | null) => void;
	onAssignedProjectChange: (index: number, value: string | null) => void;
	onApprove: (key: string, checked: boolean) => void;
	onProjectAreaChange: (key: string, value: string) => void;
	onBeginEdit: (kind: string, index: number, value: string) => void;
	onEditedValueChange: (key: string, value: string) => void;
	onEditFieldChange: (
		key: string,
		field: keyof CaptureEditedFields,
		value: string | null | string[],
	) => void;
	onSaveEdit: (kind: string, index: number) => void;
	onCancelEdit: () => void;
	onReject: (key: string) => void;
	onUndoReject: (key: string, token: CaptureUndoToken) => void;
	onSave: () => Promise<void>;
	onRetry: () => Promise<void>;
};

function CaptureGroup({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: IconComponent;
	children: React.ReactNode;
}) {
	return (
		<div className="capture-group">
			<div className="capture-group-heading">
				<Icon
					size={16}
					color="currentColor"
					weight="Outline"
					strokeWidth={1.7}
					aria-hidden="true"
				/>
				<h3>{title}</h3>
			</div>
			<div className="space-y-3">{children}</div>
		</div>
	);
}

export function CaptureReviewPanel({
	result,
	areas,
	projects,
	areaNames,
	projectNames,
	suggestions,
	approved,
	assignedAreas,
	assignedProjects,
	rejectedItems,
	editingItem,
	editedValues,
	editedFields,
	projectAreas,
	saving,
	canSave,
	saveError,
	undoToken,
	onAssignedAreaChange,
	onAssignedProjectChange,
	onApprove,
	onProjectAreaChange,
	onBeginEdit,
		onEditedValueChange,
		onEditFieldChange,
		onSaveEdit,
	onCancelEdit,
	onReject,
	onUndoReject,
	onSave,
	onRetry,
}: ReviewProps) {
		const approvedSuggestionCount = suggestions.filter((suggestion) =>
			Boolean(approved[suggestionKey(suggestion)]),
		).length;
		const { originallyEmpty, emptyAfterManualDiscard, remainingResultCount } =
			getCaptureReviewState(result, rejectedItems, approvedSuggestionCount);
		const attentionCount = getCaptureReviewAttention(
			result,
			rejectedItems,
			assignedAreas,
			assignedProjects,
			projects,
		);
		const reviewStartsExpanded = attentionCount > 0;
		const [destinationQueries, setDestinationQueries] = useState<Record<string, string>>({});
		const [editingDestination, setEditingDestination] = useState<
			Record<string, boolean>
		>({});
		const saveErrorRef = useRef<HTMLParagraphElement | null>(null);
		useEffect(() => {
			if (saveError) saveErrorRef.current?.focus();
		}, [saveError]);
		const undoButtonRef = useRef<HTMLButtonElement | null>(null);
	const cardRefs = useRef<Record<string, HTMLElement | null>>({});
	const [focusAfterUndoKey, setFocusAfterUndoKey] = useState<string | null>(
		null,
	);
	useEffect(() => {
		if (undoToken) undoButtonRef.current?.focus();
	}, [undoToken]);
	useEffect(() => {
		if (!undoToken && focusAfterUndoKey) {
			cardRefs.current[focusAfterUndoKey]?.focus();
			setFocusAfterUndoKey(null);
		}
	}, [undoToken, focusAfterUndoKey]);
	const selectedArea = (kind: string, index: number, fallback: string | null) =>
		Object.prototype.hasOwnProperty.call(assignedAreas, `${kind}:${index}`)
			? assignedAreas[`${kind}:${index}`]
			: fallback;
	const areaSelect = (kind: string, index: number, current: string | null) => {
		const key = `${kind}:${index}`;
		const destination = selectedArea(kind, index, current);
		const userAssigned = Object.prototype.hasOwnProperty.call(assignedAreas, key);
		if (destination && !editingDestination[key]) {
			return (
				<div className="capture-item-destination">
					<span role="status" aria-live="polite">
						{userAssigned ? "Destino: " : "Sugerimos "}
						<strong>{areaNames.get(destination) ?? "este destino"}</strong>.
					</span>
					<button type="button" disabled={saving} className="capture-item-change"
						onClick={() => setEditingDestination((previous) => ({ ...previous, [key]: true }))}>
						Cambiar
					</button>
				</div>
			);
		}
		return (
			<div className="capture-item-destination capture-item-destination-editing">
				{areas.length > 12 ? (
					<>
					<input className="input input-bordered input-xs" list={`capture-areas-${key}`}
						disabled={saving} value={destinationQueries[key] ?? (destination ? areaNames.get(destination) ?? "" : "")}
						placeholder="Buscar área…" aria-label={`Asignar ${kind} ${index + 1} a un área`}
						onChange={(event) => {
							const query = event.target.value;
							setDestinationQueries((previous) => ({ ...previous, [key]: query }));
							const match = areas.find((area) => area.name.toLowerCase() === query.toLowerCase());
							if (query === "Dejar en Inbox") onAssignedAreaChange(kind, index, null);
							else if (match) onAssignedAreaChange(kind, index, match.id);
						}} onBlur={() => setDestinationQueries((previous) => ({ ...previous, [key]: destination ? areaNames.get(destination) ?? "" : "" }))} />
					<datalist id={`capture-areas-${key}`}>
						<option value="Dejar en Inbox" />
						{areas.map((area) => <option value={area.name} key={area.id} />)}
					</datalist>
				</>
			) : (
				<select className="capture-touch-select select select-bordered select-xs" disabled={saving}
					value={destination ?? ""} onChange={(event) => {
						onAssignedAreaChange(kind, index, event.target.value || null);
						setEditingDestination((previous) => ({ ...previous, [key]: false }));
					}} aria-label={`Asignar ${kind} ${index + 1} a un área`}>
					<option value="">Dejar en Inbox</option>
					{areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
				</select>
			)}
			</div>
		);
	};
	const effectiveProject = (index: number, fallback: string | null) => {
		const key = `task:${index}`;
		return Object.prototype.hasOwnProperty.call(assignedProjects, key)
			? assignedProjects[key]
			: fallback;
	};
	const projectSelect = (index: number, currentProject: string | null) => {
		const area = selectedArea("task", index, result.tasks[index]?.area_id ?? null);
		const project = effectiveProject(index, currentProject);
		const options = projects.filter((item) => item.area_id === area);
		return (
			<div className="capture-item-destination capture-item-project">
				<span className="text-xs text-base-content/60">Proyecto</span>
				{options.length > 12 ? (
					<>
						<input className="input input-bordered input-xs" list={`capture-projects-${index}`}
							disabled={saving} value={destinationQueries[`project:${index}`] ?? (project ? projectNames.get(project) ?? "" : "")}
							placeholder="Buscar proyecto…" aria-label={`Asignar tarea ${index + 1} a un proyecto`}
							onChange={(event) => {
								const query = event.target.value;
								setDestinationQueries((previous) => ({ ...previous, [`project:${index}`]: query }));
								const match = options.find((item) => item.name.toLowerCase() === query.toLowerCase());
								if (query === "Sin proyecto") onAssignedProjectChange(index, null);
								else if (match) onAssignedProjectChange(index, match.id);
							}} onBlur={() => setDestinationQueries((previous) => ({ ...previous, [`project:${index}`]: project ? projectNames.get(project) ?? "" : "" }))} />
						<datalist id={`capture-projects-${index}`}>
							<option value="Sin proyecto" />
							{options.map((item) => <option value={item.name} key={item.id} />)}
						</datalist>
					</>
				) : (
					<select className="capture-touch-select select select-bordered select-xs" disabled={saving}
						value={project ?? ""} onChange={(event) => onAssignedProjectChange(index, event.target.value || null)}
						aria-label={`Asignar tarea ${index + 1} a un proyecto`}>
						<option value="">Sin proyecto</option>
						{options.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
					</select>
				)}
			</div>
		);
	};
	const reviewControls = (kind: string, index: number, value: string) => {
		const key = `${kind}:${index}`;
		const fields = editedFields?.[key] ?? {};
		if (rejectedItems[key])
			return (
				<div className="capture-item-discarded">
					<span role="status" aria-live="polite">
						{undoToken?.key === key ? "Elemento descartado; puedes deshacerlo" : "Descartado; este elemento no se guardará."}
					</span>
					{undoToken?.key === key && (
						<button ref={undoButtonRef} type="button" className="btn btn-ghost btn-xs" disabled={saving}
							onClick={() => { setFocusAfterUndoKey(key); onUndoReject(key, undoToken); }}>
							Deshacer descarte
						</button>
					)}
				</div>
			);
		if (editingItem === key)
			return (
				<div className="capture-item-edit">
					<label className="sr-only" htmlFor={`edit-${key}`}>Editar {kind} {index + 1}</label>
					<textarea id={`edit-${key}`} className="textarea textarea-bordered w-full" disabled={saving}
						value={editedValues[key] ?? value}
						onChange={(event) => onEditedValueChange(key, event.target.value)} />
					{kind === "task" && (
						<label className="mt-2 block text-xs">
							Fecha de vencimiento
							<input type="date" className="input input-bordered input-xs ml-2" disabled={saving}
								value={fields.due_date ?? result.tasks[index]?.due_date ?? ""}
								onChange={(event) => onEditFieldChange(key, "due_date", event.target.value || null)} />
						</label>
					)}
					{kind === "knowledge" && (
						<>
							<label className="mt-2 block text-xs">Contenido
								<textarea className="textarea textarea-bordered mt-1 w-full" disabled={saving}
									value={fields.content ?? result.second_brain[index]?.content ?? ""}
									onChange={(event) => onEditFieldChange(key, "content", event.target.value)} />
							</label>
							<label className="mt-2 block text-xs">Etiquetas
								<input className="input input-bordered input-xs mt-1 w-full" disabled={saving}
									value={(fields.tags ?? result.second_brain[index]?.tags ?? []).join(", ")}
									onChange={(event) => onEditFieldChange(key, "tags", event.target.value.split(","))} />
							</label>
						</>
					)}
					<div className="flex gap-2">
						<button type="button" className="btn btn-primary btn-xs" disabled={saving} onClick={() => onSaveEdit(kind, index)}>Guardar edición</button>
						<button type="button" className="btn btn-ghost btn-xs" disabled={saving} onClick={onCancelEdit}>Cancelar</button>
					</div>
				</div>
			);
		return (
			<div className="capture-item-actions">
				{editedFields?.[key] && <span className="text-xs text-base-content/60" role="status">Modificado</span>}
				<button type="button" className="btn btn-ghost btn-xs" disabled={saving} onClick={() => onBeginEdit(kind, index, value)}>Editar elemento</button>
				<button type="button" className="btn btn-ghost btn-xs text-error" disabled={saving} onClick={() => onReject(key)}>Rechazar elemento</button>
			</div>
		);
	};

	return (
		<section
			className="capture-result-area"
			aria-labelledby="capture-review-heading"
		>
			<h2 id="capture-review-heading" className="sr-only">
				Revisión de la captura
			</h2>
				<section className="capture-result-summary" role="status" aria-live="polite">
					<div>
						<Check3
							size={16}
							color="currentColor"
							weight="Outline"
							strokeWidth={1.7}
							aria-hidden="true"
						/>
						<span className="capture-result-summary-label">Resumen listo</span>
						<strong>
							{remainingResultCount}{" "}
							{remainingResultCount === 1 ? "elemento listo" : "elementos listos"}
						</strong>
						<span>
							{attentionCount}{" "}
							{attentionCount === 1 ? "requiere atención" : "requieren atención"}
						</span>
						{suggestions.length > 0 && (
							<span>
								{approvedSuggestionCount}{" "}
								{approvedSuggestionCount === 1
									? "sugerencia aprobada"
									: "sugerencias aprobadas"}
							</span>
						)}
					</div>
				</section>
				<ShowMore
					moreLabel="Revisar detalles"
					lessLabel="Ocultar detalles"
					label="Detalles del resumen"
					defaultExpanded={reviewStartsExpanded}
					lines={2}
					maxHeight={Number.MAX_SAFE_INTEGER}
					className="capture-review-disclosure mt-3"
				>
				<div className="capture-results-wrapper space-y-6">
					<section className="capture-results-grid grid gap-4 md:grid-cols-3">
						{result.tasks.length > 0 && (
							<CaptureGroup title="Tareas" icon={ListCheck}>
								{result.tasks.map((item, index) => (
									<article
										className="capture-result-card rounded-box border p-4"
										aria-label={`Tarea ${index + 1}: ${item.title}`}
										tabIndex={-1}
										ref={(node) => {
											cardRefs.current[`task:${index}`] = node;
										}}
										key={`${item.title}-${index}`}
									>
										<MarkdownRenderer content={item.title} compact headingMode="card" />
										<p className="mt-2 text-xs text-base-content/60">
											{(() => {
												const area = selectedArea("task", index, item.area_id);
												const project = effectiveProject(index, item.project_id);
												return `${area ? areaNames.get(area) ?? "este destino" : "Se guardará en Inbox"}${project && projectNames.get(project) ? ` / ${projectNames.get(project)}` : ""}`;
											})()}
											{formatTaskDue(item.due_date, item.due_at)
												? ` · ${formatTaskDue(item.due_date, item.due_at)}`
												: ""}
										</p>
										{areaSelect("task", index, item.area_id)}
										{projectSelect(index, item.project_id)}
										{reviewControls("task", index, item.title)}
									</article>
								))}
							</CaptureGroup>
						)}
						{result.ideas.length > 0 && (
							<CaptureGroup title="Ideas" icon={Bulb}>
								{result.ideas.map((item, index) => (
									<article
										className="capture-result-card rounded-box border p-4"
										aria-label={`Idea ${index + 1}: ${item.content}`}
										tabIndex={-1}
										ref={(node) => {
											cardRefs.current[`idea:${index}`] = node;
										}}
										key={`${item.content}-${index}`}
									>
										<MarkdownRenderer content={item.content} headingMode="card" />
										<p className="mt-2 text-xs text-base-content/60">
											{areaNames.get(item.area_id ?? "") ??
												item.suggested_new_area ??
												"Se guardará en Inbox"}
										</p>
										{areaSelect("idea", index, item.area_id)}
										{reviewControls("idea", index, item.content)}
									</article>
								))}
							</CaptureGroup>
						)}
						{result.second_brain.length > 0 && (
							<CaptureGroup title="Conocimiento" icon={BookSaved}>
								{result.second_brain.map((item, index) => (
									<article
										className="capture-result-card rounded-box border p-4"
										aria-label={`Conocimiento ${index + 1}: ${item.title}`}
										tabIndex={-1}
										ref={(node) => {
											cardRefs.current[`knowledge:${index}`] = node;
										}}
										key={`${item.title}-${index}`}
									>
										<h4 className="capture-card-title">{item.title}</h4>
										<MarkdownRenderer content={item.content} headingMode="card" />
										<p className="mt-2 text-xs text-base-content/60">
											{areaNames.get(item.area_id ?? "") ??
												item.suggested_new_area ??
												"Se guardará en Inbox"}
										</p>
										{areaSelect("knowledge", index, item.area_id)}
										{reviewControls("knowledge", index, item.title)}
									</article>
								))}
							</CaptureGroup>
						)}
						{originallyEmpty && (
							<div className="capture-empty-result" role="status">
								<p>
									Conservaremos íntegramente tu nota original en Inbox al guardar
									{suggestions.length > 0
										? "; las sugerencias aprobadas también se guardarán."
										: "."}
								</p>
							</div>
						)}
						{emptyAfterManualDiscard && (
							<div className="capture-empty-result">
								<p role="status" aria-live="polite">
									{suggestions.length > 0
										? "Selecciona al menos una sugerencia para guardar."
										: "No encontramos elementos claros para ordenar."}{" "}
									Edita tu nota arriba y vuelve a intentarlo.
								</p>
								<button
									type="button"
									className="capture-retry-action btn btn-primary btn-sm"
									disabled={saving}
									onClick={() => void onRetry().catch(() => undefined)}
								>
									Volver a intentar
								</button>
							</div>
						)}
					</section>
					{suggestions.length > 0 && (
						<section className="capture-suggestions space-y-4 rounded-box border p-5">
							<div>
								<h3 className="text-xl font-semibold">Sugerencias para revisar</h3>
								<p className="mt-1 text-sm text-base-content/70">
									Encontramos una estructura que podría ayudarte. Confirma solo lo que
									quieras incorporar.
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
											disabled={saving}
											type="checkbox"
											checked={Boolean(approved[suggestionKey(suggestion)])}
											onChange={(event) =>
												onApprove(suggestionKey(suggestion), event.target.checked)
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
											className="capture-touch-select select select-bordered select-sm"
											disabled={saving}
											value={
												projectAreas[suggestionKey(suggestion)] ?? suggestion.area_id ?? ""
											}
											onChange={(event) =>
												onProjectAreaChange(suggestionKey(suggestion), event.target.value)
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
				</div>
			</ShowMore>
			<div className="capture-save-row sticky bottom-4 z-10 flex flex-col items-end gap-3 rounded-box border bg-base-100/95 p-3 shadow-lg backdrop-blur">
				{saveError && (
					<p
						ref={saveErrorRef}
						className="capture-alert capture-alert-error w-full"
						role="alert"
						tabIndex={-1}
					>
						{saveError}{" "}
						<button
							type="button"
							className="btn btn-ghost btn-xs"
							disabled={saving}
							onClick={() => void onSave().catch(() => undefined)}
						>
							Reintentar
						</button>
					</p>
				)}
				<LoadingButton
					className="capture-save-action"
					onAction={onSave}
					disabled={saving || !canSave || emptyAfterManualDiscard}
					pendingLabel="Guardando…"
					successLabel="Guardado"
					errorLabel="Reintentar"
				>
					{`Guardar ${remainingResultCount + approvedSuggestionCount} ${
						remainingResultCount + approvedSuggestionCount === 1 ? "elemento" : "elementos"
					}`}
				</LoadingButton>
			</div>
		</section>
	);
}
