"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MarkdownEditor } from "@/components/capture/MarkdownEditor";
import { MarkdownRenderer } from "@/components/capture/MarkdownRenderer";
import TaskForm from "@/components/tasks/TaskForm";
import TaskList from "@/components/tasks/TaskList";
import IdeaForm from "@/components/ideas/IdeaForm";
import IdeaList from "@/components/ideas/IdeaList";
import BookSaved from "reicon-react/icons/BookSaved";
import type {
	Area,
	Project,
	Task,
	ProjectStatus,
	Idea,
	SecondBrainEntry,
} from "@/types";
import { LoadingButton } from "@/components/interior/loading-button";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";

export default function AreaPage({
	params,
}: {
	params: Promise<{ areaId: string }>;
}) {
	const { areaId } = use(params);
	const router = useRouter();
	const [area, setArea] = useState<Area | null>(null);
	const [projects, setProjects] = useState<Project[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [ideas, setIdeas] = useState<Idea[]>([]);
	const [knowledge, setKnowledge] = useState<SecondBrainEntry[]>([]);
	const [projectName, setProjectName] = useState("");
	const [projectDescription, setProjectDescription] = useState("");
	const [noteTitle, setNoteTitle] = useState("");
	const [noteContent, setNoteContent] = useState("");
	const [noteTags, setNoteTags] = useState("");
	const [editing, setEditing] = useState(false);
	const [areaName, setAreaName] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			setError("Tu sesión ha caducado. Vuelve a iniciar sesión.");
			setLoading(false);
			return;
		}
		const [areaResult, projectResult, taskResult, ideaResult, knowledgeResult] =
			await Promise.all([
				supabase
					.from("areas")
					.select("*")
					.eq("id", areaId)
					.eq("user_id", user.id)
					.single(),
				supabase
					.from("projects")
					.select("*")
					.eq("area_id", areaId)
					.eq("user_id", user.id)
					.order("created_at"),
				supabase
					.from("tasks")
					.select("*")
					.eq("area_id", areaId)
					.eq("user_id", user.id)
					.order("created_at", { ascending: false }),
				supabase
					.from("ideas")
					.select("*")
					.eq("area_id", areaId)
					.eq("user_id", user.id)
					.order("created_at", { ascending: false }),
				supabase
					.from("second_brain")
					.select("*")
					.eq("area_id", areaId)
					.eq("user_id", user.id)
					.order("created_at", { ascending: false }),
			]);
		if (areaResult.error || !areaResult.data)
			setError("No encontramos esta área o no está disponible.");
		else {
			setArea(areaResult.data as Area);
			setAreaName(areaResult.data.name);
			setProjects((projectResult.data ?? []) as Project[]);
			setTasks((taskResult.data ?? []) as Task[]);
			setIdeas((ideaResult.data ?? []) as Idea[]);
			setKnowledge((knowledgeResult.data ?? []) as SecondBrainEntry[]);
		}
		if (
			projectResult.error ||
			taskResult.error ||
			ideaResult.error ||
			knowledgeResult.error
		)
			setError("No pudimos cargar parte del contenido del área.");
		setLoading(false);
	}, [areaId]);

	useEffect(() => {
		void load();
	}, [load]);

	async function updateArea() {
		const cleanName = areaName.trim();
		if (!cleanName) {
			setError("El nombre del área es necesario.");
			return;
		}
		setSaving(true);
		const { data, error: updateError } = await createClient()
			.from("areas")
			.update({ name: cleanName })
			.eq("id", areaId)
			.eq("user_id", area?.user_id)
			.select("*")
			.single();
		if (updateError || !data)
			setError("No pudimos actualizar el área. Inténtalo de nuevo.");
		else {
			setArea(data as Area);
			setEditing(false);
		}
		setSaving(false);
	}

	async function createKnowledge() {
		if (!area || !noteTitle.trim() || !noteContent.trim()) {
			setError("El título y el contenido de la nota son necesarios.");
			return;
		}
		setSaving(true);
		setError("");
		const tags = noteTags
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean)
			.slice(0, 20);
		const { data, error: insertError } = await createClient()
			.from("second_brain")
			.insert({
				user_id: area.user_id,
				area_id: area.id,
				title: noteTitle.trim(),
				content: noteContent.trim(),
				tags,
			})
			.select("*")
			.single();
		if (insertError || !data)
			setError("No pudimos guardar la nota. Inténtalo de nuevo.");
		else {
			setKnowledge((current) => [data as SecondBrainEntry, ...current]);
			setNoteTitle("");
			setNoteContent("");
			setNoteTags("");
		}
		setSaving(false);
	}

	async function deleteArea() {
		if (!window.confirm("¿Eliminar esta área y todo su contenido?")) return;
		const { error: deleteError } = await createClient()
			.from("areas")
			.delete()
			.eq("id", areaId)
			.eq("user_id", area?.user_id);
		if (deleteError)
			setError("No pudimos eliminar el área. Inténtalo de nuevo.");
		else router.replace("/areas");
	}

	async function createProject() {
		const cleanName = projectName.trim();
		if (!cleanName || !area) {
			setError("El nombre del proyecto es necesario.");
			return;
		}
		setSaving(true);
		const { data, error: insertError } = await createClient()
			.from("projects")
			.insert({
				user_id: area.user_id,
				area_id: area.id,
				name: cleanName,
				description: projectDescription.trim() || null,
				status: "active" as ProjectStatus,
			})
			.select("*")
			.single();
		if (insertError || !data)
			setError("No pudimos crear el proyecto. Inténtalo de nuevo.");
		else {
			setProjects((current) => [...current, data as Project]);
			setProjectName("");
			setProjectDescription("");
		}
		setSaving(false);
	}

	if (loading)
		return (
			<SkeletonSwap ready={false} lines={8} reserve={420} label="Area">
				{null}
			</SkeletonSwap>
		);
	if (!area)
		return (
			<div className="space-y-4">
				<p role="alert">{error || "No encontramos esta área."}</p>
				<Link className="btn btn-ghost" href="/areas">
					Volver a áreas
				</Link>
			</div>
		);

	return (
		<div className="app-page app-area-page space-y-8">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					{editing ? (
						<form
							className="flex gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								void updateArea();
							}}
						>
							<input
								className="input input-bordered"
								value={areaName}
								onChange={(event) => setAreaName(event.target.value)}
								maxLength={100}
							/>
							<LoadingButton
								className="btn btn-primary"
								onAction={updateArea}
								pendingLabel="Guardando…"
								disabled={saving}
							>
								Guardar
							</LoadingButton>
							<button
								className="btn btn-ghost"
								type="button"
								onClick={() => {
									setAreaName(area.name);
									setEditing(false);
								}}
								disabled={saving}
							>
								Cancelar
							</button>
						</form>
					) : (
						<>
							<Link className="text-sm text-primary" href="/areas">
								← Áreas
							</Link>
							<h1 className="mt-2 text-4xl font-bold">{area.name}</h1>
						</>
					)}{" "}
				</div>
				<div className="flex gap-2">
					{!editing && (
						<button
							className="btn btn-ghost"
							type="button"
							onClick={() => setEditing(true)}
						>
							Editar
						</button>
					)}
					<button
						className="btn btn-outline btn-error"
						type="button"
						onClick={deleteArea}
						disabled={saving}
					>
						Eliminar
					</button>
				</div>
			</div>
			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}
			<section className="space-y-4">
				<div>
					<h2 className="text-2xl font-semibold">Proyectos</h2>
					<p className="text-base-content/60">
						Agrupa tareas relacionadas y sigue su avance.
					</p>
				</div>
				<form
					className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-[1fr_1fr_auto]"
					onSubmit={(event) => {
						event.preventDefault();
						void createProject();
					}}
				>
					<input
						className="input input-bordered"
						placeholder="Nombre del proyecto"
						value={projectName}
						onChange={(event) => setProjectName(event.target.value)}
						maxLength={150}
					/>
					<input
						className="input input-bordered"
						placeholder="Descripción (opcional)"
						value={projectDescription}
						onChange={(event) => setProjectDescription(event.target.value)}
						maxLength={1000}
					/>
					<LoadingButton
						className="btn btn-primary"
						onAction={createProject}
						pendingLabel="Creando…"
						disabled={saving || !projectName.trim()}
					>
						Add project
					</LoadingButton>
				</form>
				{projects.length === 0 ? (
					<p className="rounded-box border border-dashed border-base-300 p-6 text-base-content/60">
						Aún no hay proyectos.
					</p>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{projects.map((project) => (
							<Link
								className="rounded-box border border-base-300 bg-base-100 p-5 hover:border-primary"
								href={`/areas/${area.id}/projects/${project.id}`}
								key={project.id}
							>
								<div className="flex justify-between gap-3">
									<h3 className="font-semibold">{project.name}</h3>
									<span className="badge badge-outline">{project.status}</span>
								</div>
								{project.description && (
									<p className="mt-2 text-sm text-base-content/70">
										{project.description}
									</p>
								)}
							</Link>
						))}
					</div>
				)}
			</section>
			<section className="space-y-4">
				<div>
					<h2 className="text-2xl font-semibold">Tareas</h2>
					<p className="text-base-content/60">
						Todas las tareas de esta área, también las de sus proyectos.
					</p>
				</div>
				<div className="task-capture-shell">
					<TaskForm
						areaId={area.id}
						onCreatedAction={(task) =>
							setTasks((current) => [task, ...current])
						}
					/>
				</div>
				<TaskList
					tasks={tasks}
					onStatusChangedAction={(task) =>
						setTasks((current) =>
							current.map((item) => (item.id === task.id ? task : item)),
						)
					}
					onDeletedAction={(id) =>
						setTasks((current) => current.filter((task) => task.id !== id))
					}
				/>
			</section>
			<section className="space-y-4">
				<div>
					<h2 className="text-2xl font-semibold">Ideas</h2>
					<p className="text-base-content/60">
						Guarda posibilidades sin convertirlas en tareas.
					</p>
				</div>
				<div className="idea-capture-shell">
					<IdeaForm
						areaId={area.id}
						onCreatedAction={(idea) =>
							setIdeas((current) => [idea, ...current])
						}
					/>
				</div>
				<IdeaList
					ideas={ideas}
					onChangedAction={(idea) =>
						setIdeas((current) =>
							current.map((item) => (item.id === idea.id ? idea : item)),
						)
					}
					onDeletedAction={(id) =>
						setIdeas((current) => current.filter((idea) => idea.id !== id))
					}
				/>
			</section>
			<section className="app-area-section app-area-notes-section space-y-4">
				<div className="app-area-section-heading knowledge-note-section-heading">
					<div>
						<p className="app-section-kicker">Nota nueva · {area.name}</p>
						<p>Escribe y conserva lo importante.</p>
					</div>
				</div>
				<form
					className="knowledge-note-editor"
					onSubmit={(event) => {
						event.preventDefault();
						void createKnowledge();
					}}
				>
					<input
						className="knowledge-note-title"
						placeholder="Título de la nota"
						value={noteTitle}
						onChange={(event) => setNoteTitle(event.target.value)}
						maxLength={200}
						aria-label="Título de la nota"
					/>
					<MarkdownEditor
						value={noteContent}
						onChangeAction={setNoteContent}
						maxLength={10000}
						variant="document"
					/>
					<div className="knowledge-note-footer">
						<input
							className="knowledge-note-tags"
							placeholder="Etiquetas opcionales"
							value={noteTags}
							onChange={(event) => setNoteTags(event.target.value)}
							maxLength={500}
							aria-label="Etiquetas de la nota"
						/>
						<LoadingButton
							className="btn btn-primary"
							onAction={createKnowledge}
							pendingLabel="Guardando…"
							disabled={saving || !noteTitle.trim() || !noteContent.trim()}
						>
							Guardar nota
						</LoadingButton>
					</div>
				</form>
			</section>
			<section className="app-area-section space-y-4">
				<div className="app-area-section-heading">
					<div>
						<p className="app-section-kicker">Conocimiento</p>
						<h2>Lo que quieres conservar</h2>
						<p>Notas y aprendizajes conectados con esta área.</p>
					</div>
					<BookSaved
						size={20}
						color="currentColor"
						weight="Outline"
						aria-hidden="true"
					/>
				</div>
				{knowledge.length === 0 ? (
					<p className="app-empty-state">
						Aún no hay conocimiento en esta área.
					</p>
				) : (
					<div className="app-knowledge-list">
						{knowledge.slice(0, 4).map((entry) => (
							<article className="app-knowledge-item" key={entry.id}>
								<h3>{entry.title}</h3>
								<div className="markdown-content">
									<MarkdownRenderer content={entry.content} />
								</div>
							</article>
						))}
					</div>
				)}
				<Link className="app-text-link" href="/second-brain">
					Ver todo el conocimiento
				</Link>
			</section>
		</div>
	);
}
