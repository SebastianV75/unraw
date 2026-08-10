"use client";

import ArrowRight4 from "reicon-react/icons/ArrowRight4";
import Check3 from "reicon-react/icons/Check3";
import InboxIcon from "reicon-react/icons/Inbox";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import { createClient } from "@/lib/supabase/client";
import type { Area, CaptureHistory, InboxItem, Project, Task } from "@/types";

function formatDate(value: string | null) {
	if (!value) return "Sin fecha";
	return new Intl.DateTimeFormat("es", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

function taskLabel(task: Task) {
	return task.status === "in_progress" ? "En curso" : "Pendiente";
}

export default function OverviewPage() {
	const [areas, setAreas] = useState<Area[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [inbox, setInbox] = useState<InboxItem[]>([]);
	const [history, setHistory] = useState<CaptureHistory[]>([]);
	const [areaId, setAreaId] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		async function load() {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setError("Tu sesión terminó. Vuelve a entrar para continuar.");
				setLoading(false);
				return;
			}
			const [
				areaResult,
				projectResult,
				taskResult,
				inboxResult,
				historyResult,
			] = await Promise.all([
				supabase.from("areas").select("*").eq("user_id", user.id).order("name"),
				supabase
					.from("projects")
					.select("*")
					.eq("user_id", user.id)
					.eq("status", "active")
					.order("created_at", { ascending: false }),
				supabase
					.from("tasks")
					.select("*")
					.eq("user_id", user.id)
					.neq("status", "done")
					.order("due_date", { ascending: true, nullsFirst: false })
					.order("created_at", { ascending: false }),
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
					.order("created_at", { ascending: false })
					.limit(3),
			]);
			if (
				areaResult.error ||
				projectResult.error ||
				taskResult.error ||
				inboxResult.error ||
				historyResult.error
			)
				setError("No pudimos cargar tu orientación de hoy.");
			setAreas((areaResult.data ?? []) as Area[]);
			setProjects((projectResult.data ?? []) as Project[]);
			setTasks((taskResult.data ?? []) as Task[]);
			setInbox((inboxResult.data ?? []) as InboxItem[]);
			setHistory((historyResult.data ?? []) as CaptureHistory[]);
			setLoading(false);
		}
		void load();
	}, []);

	const areaNames = useMemo(
		() => new Map(areas.map((area) => [area.id, area.name])),
		[areas],
	);
	const visibleTasks = useMemo(
		() =>
			areaId === "all"
				? tasks
				: tasks.filter((task) => task.area_id === areaId),
		[areaId, tasks],
	);
	const nextTask = visibleTasks[0] ?? null;
	const taskQueue = visibleTasks.slice(1, 5);

	const projectProgress = useMemo(() => {
		return projects.slice(0, 4).map((project) => {
			const projectTasks = tasks.filter(
				(task) => task.project_id === project.id,
			);
			const completed = projectTasks.filter(
				(task) => task.status === "done",
			).length;
			return {
				project,
				completed,
				total: projectTasks.length,
				percentage: projectTasks.length
					? Math.round((completed / projectTasks.length) * 100)
					: 0,
			};
		});
	}, [projects, tasks]);

	return (
		<div className="overview-page">
			<header className="overview-header">
				<div>
					<p className="overview-label">Orientación</p>
					<h1>Hoy</h1>
					<p className="overview-lead">
						Un lugar breve para volver a saber qué importa.
					</p>
				</div>
				<Link className="overview-primary-action" href="/capture">
					Nueva captura
					<ArrowRight4
						size={16}
						color="currentColor"
						weight="Outline"
						strokeWidth={1.7}
						aria-hidden="true"
					/>
				</Link>
			</header>

			{error && (
				<p className="overview-alert" role="alert">
					{error}
				</p>
			)}

			<SkeletonSwap ready={!loading} lines={7} reserve={520} label="Hoy">
				{!loading && (
					<div className="overview-flow">
						<section
							className="overview-focus-card"
							aria-labelledby="next-action-title"
						>
							<div className="overview-focus-copy">
								<p className="overview-label">Siguiente acción</p>
								<h2 id="next-action-title">
									{nextTask ? nextTask.title : "Tu espacio está despejado."}
								</h2>
								{nextTask ? (
									<p>
										{areaNames.get(nextTask.area_id) ?? "Sin área"} ·{" "}
										{taskLabel(nextTask)} · {formatDate(nextTask.due_date)}
									</p>
								) : (
									<p>Captura algo nuevo cuando vuelva a aparecer una idea.</p>
								)}
							</div>
							{nextTask ? (
								<Link
									className="overview-focus-action"
									href={`/areas/${nextTask.area_id}`}
								>
									Abrir área
									<ArrowRight4
										size={15}
										color="currentColor"
										weight="Outline"
										aria-hidden="true"
									/>
								</Link>
							) : (
								<Check3
									size={28}
									color="currentColor"
									weight="Outline"
									aria-hidden="true"
								/>
							)}
						</section>

						<div className="overview-flow-controls">
							<label className="overview-filter">
								<span>Área</span>
								<select
									value={areaId}
									onChange={(event) => setAreaId(event.target.value)}
									aria-label="Filtrar Hoy por área"
								>
									<option value="all">Todas las áreas</option>
									{areas.map((area) => (
										<option key={area.id} value={area.id}>
											{area.name}
										</option>
									))}
								</select>
							</label>
							<span className="overview-flow-count">
								{visibleTasks.length} pendientes
							</span>
						</div>

						<div className="overview-flow-grid">
							<section
								className="overview-flow-section"
								aria-labelledby="queue-title"
							>
								<div className="overview-section-heading">
									<div>
										<h2 id="queue-title">Después</h2>
										<p>Una cola corta para no perder el hilo.</p>
									</div>
								</div>
								{taskQueue.length === 0 ? (
									<p className="overview-empty">
										No hay más tareas pendientes.
									</p>
								) : (
									<div className="overview-task-queue">
										{taskQueue.map((task) => (
											<Link
												className="overview-task-row"
												href={`/areas/${task.area_id}`}
												key={task.id}
											>
												<span>{task.title}</span>
												<small>
													{areaNames.get(task.area_id) ?? "Sin área"}
												</small>
											</Link>
										))}
									</div>
								)}
							</section>

							<section
								className="overview-flow-section"
								aria-labelledby="inbox-today-title"
							>
								<div className="overview-section-heading">
									<div>
										<h2 id="inbox-today-title">Sin hogar</h2>
										<p>Decisiones que pueden esperar.</p>
									</div>
									<InboxIcon
										size={20}
										color="currentColor"
										weight="Outline"
										aria-hidden="true"
									/>
								</div>
								{inbox.length === 0 ? (
									<p className="overview-empty">Inbox despejado.</p>
								) : (
									<div className="overview-task-queue">
										{inbox.slice(0, 3).map((item) => (
											<Link
												className="overview-task-row"
												href="/inbox"
												key={item.id}
											>
												<span>{item.title ?? item.content}</span>
												<small>Revisar</small>
											</Link>
										))}
									</div>
								)}
							</section>
						</div>

						<section
							className="overview-flow-section overview-projects-section"
							aria-labelledby="projects-today-title"
						>
							<div className="overview-section-heading">
								<div>
									<h2 id="projects-today-title">En marcha</h2>
									<p>Contexto suficiente, sin pedirte otra decisión.</p>
								</div>
								<Link className="overview-text-link" href="/areas">
									Ver áreas{" "}
									<ArrowRight4
										size={14}
										color="currentColor"
										weight="Outline"
										aria-hidden="true"
									/>
								</Link>
							</div>
							{projectProgress.length === 0 ? (
								<p className="overview-empty">
									Todavía no hay proyectos activos.
								</p>
							) : (
								<div className="overview-project-list">
									{projectProgress.map(
										({ project, completed, total, percentage }) => (
											<Link
												className="overview-project-row"
												href={`/areas/${project.area_id}/projects/${project.id}`}
												key={project.id}
											>
												<span>
													<strong>{project.name}</strong>
													<small>
														{areaNames.get(project.area_id) ?? "Sin área"}
													</small>
												</span>
												<span className="overview-project-progress">
													{percentage}% · {completed}/{total}
												</span>
											</Link>
										),
									)}
								</div>
							)}
						</section>

						{history.length > 0 && (
							<p className="overview-history-note">
								Última captura guardada {formatDate(history[0].created_at)} ·{" "}
								<Link href="/inbox">Ver historial</Link>
							</p>
						)}
					</div>
				)}
			</SkeletonSwap>
		</div>
	);
}
