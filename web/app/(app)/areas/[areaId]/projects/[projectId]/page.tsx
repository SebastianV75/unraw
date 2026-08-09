"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TaskForm from "@/components/tasks/TaskForm";
import TaskList from "@/components/tasks/TaskList";
import { LoadingButton } from "@/components/interior/loading-button";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import type { Area, Project, ProjectStatus, Task } from "@/types";

export default function ProjectPage({
	params,
}: {
	params: Promise<{ areaId: string; projectId: string }>;
}) {
	const { areaId, projectId } = use(params);
	const router = useRouter();
	const [area, setArea] = useState<Area | null>(null);
	const [project, setProject] = useState<Project | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [projectStatus, setProjectStatus] = useState<ProjectStatus>("active");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		async function load() {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setError("Tu sesión ha caducado. Vuelve a iniciar sesión.");
				setLoading(false);
				return;
			}
			const [areaResult, projectResult, taskResult] = await Promise.all([
				supabase
					.from("areas")
					.select("*")
					.eq("id", areaId)
					.eq("user_id", user.id)
					.single(),
				supabase
					.from("projects")
					.select("*")
					.eq("id", projectId)
					.eq("area_id", areaId)
					.eq("user_id", user.id)
					.single(),
				supabase
					.from("tasks")
					.select("*")
					.eq("project_id", projectId)
					.eq("area_id", areaId)
					.eq("user_id", user.id)
					.order("created_at", { ascending: false }),
			]);
			if (
				areaResult.error ||
				projectResult.error ||
				!areaResult.data ||
				!projectResult.data
			)
				setError("No encontramos este proyecto o no está disponible.");
			else {
				const loadedProject = projectResult.data as Project;
				setArea(areaResult.data as Area);
				setProject(loadedProject);
				setName(loadedProject.name);
				setDescription(loadedProject.description ?? "");
				setProjectStatus(loadedProject.status);
				setTasks((taskResult.data ?? []) as Task[]);
			}
			if (taskResult.error)
				setError("No pudimos cargar las tareas del proyecto.");
			setLoading(false);
		}
		void load();
	}, [areaId, projectId]);

	async function updateProject() {
		const cleanName = name.trim();
		if (!cleanName) {
			setError("El nombre del proyecto es necesario.");
			return;
		}
		setSaving(true);
		setError("");
		const { data, error: updateError } = await createClient()
			.from("projects")
			.update({
				name: cleanName,
				description: description.trim() || null,
				status: projectStatus,
			})
			.eq("id", projectId)
			.eq("area_id", areaId)
			.eq("user_id", project?.user_id)
			.select("*")
			.single();
		if (updateError || !data)
			setError("No pudimos actualizar el proyecto. Inténtalo de nuevo.");
		else {
			setProject(data as Project);
			setEditing(false);
		}
		setSaving(false);
	}

	async function deleteProject() {
		if (
			!window.confirm(
				"¿Eliminar este proyecto? Sus tareas permanecerán en el área.",
			)
		)
			return;
		setSaving(true);
		setError("");
		const { error: deleteError } = await createClient()
			.from("projects")
			.delete()
			.eq("id", projectId)
			.eq("area_id", areaId)
			.eq("user_id", project?.user_id);
		if (deleteError) {
			setError("No pudimos eliminar el proyecto. Inténtalo de nuevo.");
			setSaving(false);
			return;
		}
		router.replace(`/areas/${areaId}`);
	}

	if (loading)
		return (
			<SkeletonSwap ready={false} lines={8} reserve={420} label="Project">
				{null}
			</SkeletonSwap>
		);
	if (!project || !area)
		return (
			<div className="space-y-4">
				<p role="alert">{error || "No encontramos este proyecto."}</p>
				<Link className="btn btn-ghost" href={`/areas/${areaId}`}>
					Volver al área
				</Link>
			</div>
		);

	const completed = tasks.filter((task) => task.status === "done").length;
	const progress = tasks.length
		? Math.round((completed / tasks.length) * 100)
		: 0;

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<header>
				<Link className="text-sm text-primary" href={`/areas/${area.id}`}>
					← {area.name}
				</Link>
				<div className="mt-3 flex flex-wrap items-start justify-between gap-4">
					{editing ? (
						<form
							className="w-full space-y-3"
							onSubmit={(event) => {
								event.preventDefault();
								void updateProject();
							}}
						>
							<input
								className="input input-bordered w-full"
								value={name}
								onChange={(event) => setName(event.target.value)}
								maxLength={150}
								aria-label="Nombre del proyecto"
							/>
							<textarea
								className="textarea textarea-bordered w-full"
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								maxLength={1000}
								placeholder="Descripción (opcional)"
							/>
							<select
								className="select select-bordered"
								value={projectStatus}
								onChange={(event) =>
									setProjectStatus(event.target.value as ProjectStatus)
								}
								aria-label="Estado del proyecto"
							>
								<option value="active">Activo</option>
								<option value="paused">En pausa</option>
								<option value="completed">Completado</option>
							</select>
							<div className="flex gap-2">
								<LoadingButton
									className="btn btn-primary"
									onAction={updateProject}
									pendingLabel="Guardando…"
									disabled={saving}
								>
									Guardar
								</LoadingButton>
								<button
									className="btn btn-ghost"
									type="button"
									onClick={() => {
										setName(project.name);
										setDescription(project.description ?? "");
										setProjectStatus(project.status);
										setEditing(false);
									}}
									disabled={saving}
								>
									Cancelar
								</button>
							</div>
						</form>
					) : (
						<>
							<div>
								<h1 className="text-4xl font-bold">{project.name}</h1>
								{project.description && (
									<p className="mt-2 text-base-content/70">
										{project.description}
									</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								<span className="badge badge-lg badge-outline">
									{project.status}
								</span>
								<button
									className="btn btn-ghost btn-sm"
									type="button"
									onClick={() => setEditing(true)}
								>
									Editar
								</button>
								<button
									className="btn btn-outline btn-error btn-sm"
									type="button"
									onClick={() => void deleteProject()}
									disabled={saving}
								>
									Eliminar
								</button>
							</div>
						</>
					)}
				</div>
			</header>
			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}
			<section className="rounded-box border border-base-300 bg-base-100 p-5">
				<div className="flex justify-between text-sm">
					<span>Avance</span>
					<strong>{progress}%</strong>
				</div>
				<progress
					className="progress progress-primary mt-3 w-full"
					value={progress}
					max="100"
				/>{" "}
				<p className="mt-2 text-sm text-base-content/60">
					{completed} de {tasks.length} tareas completadas
				</p>
			</section>
			<section className="space-y-4">
				<h2 className="text-2xl font-semibold">Añadir una tarea</h2>
				<div className="rounded-box border border-base-300 bg-base-100 p-4">
					<TaskForm
						areaId={area.id}
						projectId={project.id}
						onCreated={(task) => setTasks((current) => [task, ...current])}
					/>
				</div>
				<TaskList
					tasks={tasks}
					onStatusChanged={(task) =>
						setTasks((current) =>
							current.map((item) => (item.id === task.id ? task : item)),
						)
					}
					onDeleted={(id) =>
						setTasks((current) => current.filter((task) => task.id !== id))
					}
				/>
			</section>
		</div>
	);
}
