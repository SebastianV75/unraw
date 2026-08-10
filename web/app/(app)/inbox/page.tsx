"use client";

import Clock3 from "reicon-react/icons/Clock3";
import InboxIcon from "reicon-react/icons/Inbox";
import Layers from "reicon-react/icons/Layers";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoadingButton } from "@/components/interior/loading-button";
import { ShowMore } from "@/components/interior/show-more";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import { createClient } from "@/lib/supabase/client";
import type { Area, CaptureHistory, InboxItem, Project } from "@/types";

function formatDate(value: string) {
	return new Intl.DateTimeFormat("es", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

function historyCount(history: CaptureHistory) {
	const snapshot = history.output_snapshot;
	return (
		(snapshot?.tasks?.length ?? 0) +
		(snapshot?.ideas?.length ?? 0) +
		(snapshot?.second_brain?.length ?? 0)
	);
}

type InboxFilter = "all" | InboxItem["kind"];

const itemKindLabel: Record<InboxItem["kind"], string> = {
	task: "Tarea",
	idea: "Idea",
	knowledge: "Conocimiento",
};

export default function InboxPage() {
	const [items, setItems] = useState<InboxItem[]>([]);
	const [history, setHistory] = useState<CaptureHistory[]>([]);
	const [areas, setAreas] = useState<Area[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [selectedAreas, setSelectedAreas] = useState<Record<string, string>>(
		{},
	);
	const [selectedProjects, setSelectedProjects] = useState<
		Record<string, string>
	>({});
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<InboxFilter>("all");
	const [organizing, setOrganizing] = useState<Record<string, boolean>>({});

	useEffect(() => {
		const supabase = createClient();
		void Promise.all([
			supabase
				.from("inbox_items")
				.select("*")
				.eq("needs_home", true)
				.order("created_at", { ascending: false }),
			supabase
				.from("capture_batches")
				.select(
					"id, raw_note, status, output_snapshot, saved_references, archived_at, created_at, updated_at",
				)
				.eq("status", "saved")
				.order("created_at", { ascending: false }),
			supabase.from("areas").select("*").order("name"),
			supabase
				.from("projects")
				.select("*")
				.eq("status", "active")
				.order("name"),
		]).then(([inbox, batches, area, project]) => {
			setItems((inbox.data ?? []) as InboxItem[]);
			setHistory((batches.data ?? []) as CaptureHistory[]);
			setAreas((area.data ?? []) as Area[]);
			setProjects((project.data ?? []) as Project[]);
			if (inbox.error || batches.error || area.error || project.error)
				setError("No pudimos cargar tu Inbox. Inténtalo de nuevo.");
			setLoading(false);
		});
	}, []);

	const visibleItems = useMemo(
		() =>
			filter === "all" ? items : items.filter((item) => item.kind === filter),
		[filter, items],
	);

	async function assign(id: string, areaId: string, projectId?: string) {
		const response = await fetch("/api/inbox", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id,
				area_id: areaId,
				project_id: projectId || null,
			}),
		});
		if (response.ok) {
			setItems((current) => current.filter((item) => item.id !== id));
		} else {
			setError("No pudimos mover este elemento. Inténtalo de nuevo.");
			throw new Error("Inbox item could not be assigned");
		}
	}

	return (
		<div className="app-page app-inbox-page">
			<header className="app-page-header">
				<div>
					<p className="app-page-kicker">Inbox</p>
					<h1>Todo lo que capturaste.</h1>
					<p>
						Lo que todavía necesita un hogar y lo que ya quedó guardado para ti.
					</p>
				</div>
				<Link className="app-secondary-action" href="/capture">
					<InboxIcon
						size={15}
						color="currentColor"
						weight="Outline"
						aria-hidden="true"
					/>
					Nueva captura
				</Link>
			</header>

			{error && (
				<p className="app-alert app-alert-error" role="alert">
					{error}
				</p>
			)}

			<SkeletonSwap ready={!loading} lines={8} reserve={480} label="Inbox">
				{!loading ? (
					<div className="app-inbox-sections">
						<section
							className="app-surface-section"
							aria-labelledby="inbox-unhomed-title"
						>
							<div className="app-section-heading">
								<div>
									<p className="app-section-kicker">Ahora</p>
									<h2 id="inbox-unhomed-title">Sin hogar</h2>
									<p>Elementos que todavía no tienen un área.</p>
								</div>
								<div
									className="app-inbox-filter"
									role="tablist"
									aria-label="Filtrar Inbox"
								>
									{(["all", "task", "idea", "knowledge"] as InboxFilter[]).map(
										(value) => (
											<button
												className={filter === value ? "is-active" : ""}
												key={value}
												type="button"
												role="tab"
												aria-selected={filter === value}
												onClick={() => setFilter(value)}
											>
												{value === "all" ? "Todo" : itemKindLabel[value]}
											</button>
										),
									)}
								</div>
								<span className="app-count" aria-live="polite">
									{visibleItems.length}
								</span>
							</div>
							{items.length === 0 ? (
								<div className="app-empty-state">
									<Layers
										size={20}
										color="currentColor"
										weight="Outline"
										aria-hidden="true"
									/>
									<strong>Tu bandeja está despejada.</strong>
									<span>Cuando algo no encuentre lugar, aparecerá aquí.</span>
								</div>
							) : visibleItems.length === 0 ? (
								<div className="app-empty-state app-empty-state-compact">
									<strong>No hay elementos de este tipo.</strong>
									<span>Prueba otro filtro o vuelve a capturar algo.</span>
								</div>
							) : (
								<div className="app-inbox-list">
									{visibleItems.map((item) => (
										<article className="app-inbox-item" key={item.id}>
											<div className="app-inbox-item-copy">
												<span className="app-item-kind">
													{itemKindLabel[item.kind]}
												</span>
												<h3>{item.title ?? item.content}</h3>
												<p>{item.content}</p>
												<small>{formatDate(item.created_at)}</small>
											</div>
											<div className="app-inbox-item-actions">
												{!organizing[item.id] ? (
													<>
														<p className="app-inbox-ai-note">
															Lo dejamos aquí para que no tengas que decidir
															ahora.
														</p>
														<button
															className="app-secondary-action"
															type="button"
															onClick={() =>
																setOrganizing((current) => ({
																	...current,
																	[item.id]: true,
																}))
															}
														>
															Elegir destino
														</button>
													</>
												) : (
													<>
														<select
															className="app-select"
															defaultValue=""
															onChange={(event) =>
																setSelectedAreas((current) => ({
																	...current,
																	[item.id]: event.target.value,
																}))
															}
															aria-label={`Elegir área para ${item.title ?? item.kind}`}
														>
															<option value="">Elegir área</option>
															{areas.map((area) => (
																<option value={area.id} key={area.id}>
																	{area.name}
																</option>
															))}
														</select>
														{item.kind === "task" && (
															<select
																className="app-select"
																defaultValue=""
																onChange={(event) =>
																	setSelectedProjects((current) => ({
																		...current,
																		[item.id]: event.target.value,
																	}))
																}
																aria-label="Elegir proyecto"
															>
																<option value="">Sin proyecto</option>
																{projects
																	.filter(
																		(project) =>
																			project.area_id ===
																			selectedAreas[item.id],
																	)
																	.map((project) => (
																		<option value={project.id} key={project.id}>
																			{project.name}
																		</option>
																	))}
															</select>
														)}
														<LoadingButton
															className="app-primary-action"
															onAction={() =>
																assign(
																	item.id,
																	selectedAreas[item.id] ?? "",
																	selectedProjects[item.id],
																)
															}
															successLabel="Guardado"
															errorLabel="Reintentar"
															pendingLabel="Moviendo…"
															disabled={!selectedAreas[item.id]}
														>
															Guardar destino
														</LoadingButton>
													</>
												)}
											</div>
										</article>
									))}
								</div>
							)}
						</section>

						<section
							className="app-surface-section"
							aria-labelledby="inbox-history-title"
						>
							<div className="app-section-heading">
								<div>
									<p className="app-section-kicker">Memoria</p>
									<h2 id="inbox-history-title">Historial de capturas</h2>
									<p>
										Todo lo que ya soltaste, guardado para volver cuando
										quieras.
									</p>
								</div>
								<Clock3
									size={20}
									color="currentColor"
									weight="Outline"
									aria-hidden="true"
								/>
							</div>
							{history.length === 0 ? (
								<div className="app-empty-state">
									<strong>Aún no hay capturas guardadas.</strong>
									<span>
										Tu historial aparecerá aquí después de organizar algo.
									</span>
								</div>
							) : (
								<div className="app-history-list">
									{history.map((capture) => (
										<article className="app-history-item" key={capture.id}>
											<div className="app-history-item-header">
												<div>
													<span className="app-item-kind">
														{formatDate(capture.created_at)}
													</span>
													<h3>
														{capture.raw_note.split("\n")[0].slice(0, 96)}
													</h3>
												</div>
												<span className="app-count">
													{historyCount(capture)} elementos
												</span>
											</div>
											<ShowMore
												moreLabel="Ver captura original"
												lessLabel="Ocultar captura"
												label="Captura original"
												lines={2}
												maxHeight={260}
											>
												<p className="app-history-raw">{capture.raw_note}</p>
											</ShowMore>
										</article>
									))}
								</div>
							)}
						</section>
					</div>
				) : null}
			</SkeletonSwap>
		</div>
	);
}
