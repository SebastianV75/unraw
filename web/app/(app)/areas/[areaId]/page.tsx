"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TaskForm from "@/components/tasks/TaskForm";
import TaskList from "@/components/tasks/TaskList";
import IdeaForm from "@/components/ideas/IdeaForm";
import IdeaList from "@/components/ideas/IdeaList";
import type { Area, Project, Task, ProjectStatus, Idea } from "@/types";
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
	const [projectName, setProjectName] = useState("");
	const [projectDescription, setProjectDescription] = useState("");
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
			setError("Your session has expired. Please sign in again.");
			setLoading(false);
			return;
		}
		const [areaResult, projectResult, taskResult, ideaResult] =
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
			]);
		if (areaResult.error || !areaResult.data)
			setError("Area not found or unavailable.");
		else {
			setArea(areaResult.data as Area);
			setAreaName(areaResult.data.name);
			setProjects((projectResult.data ?? []) as Project[]);
			setTasks((taskResult.data ?? []) as Task[]);
			setIdeas((ideaResult.data ?? []) as Idea[]);
		}
		if (projectResult.error || taskResult.error || ideaResult.error)
			setError("Some area content could not be loaded.");
		setLoading(false);
	}, [areaId]);

	useEffect(() => {
		void load();
	}, [load]);

	async function updateArea() {
		const cleanName = areaName.trim();
		if (!cleanName) {
			setError("An area name is required.");
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
		if (updateError || !data) setError("We could not update the area.");
		else {
			setArea(data as Area);
			setEditing(false);
		}
		setSaving(false);
	}

	async function deleteArea() {
		if (!window.confirm("Delete this area and all its content?")) return;
		const { error: deleteError } = await createClient()
			.from("areas")
			.delete()
			.eq("id", areaId)
			.eq("user_id", area?.user_id);
		if (deleteError) setError("We could not delete the area.");
		else router.replace("/areas");
	}

	async function createProject() {
		const cleanName = projectName.trim();
		if (!cleanName || !area) {
			setError("A project name is required.");
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
		if (insertError || !data) setError("We could not create the project.");
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
				<p role="alert">{error || "Area not found."}</p>
				<Link className="btn btn-ghost" href="/areas">
					Back to areas
				</Link>
			</div>
		);

	return (
		<div className="mx-auto max-w-5xl space-y-8">
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
								pendingLabel="Saving..."
								disabled={saving}
							>
								Save
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
								Cancel
							</button>
						</form>
					) : (
						<>
							<Link className="text-sm text-primary" href="/areas">
								← Areas
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
							Edit
						</button>
					)}
					<button
						className="btn btn-outline btn-error"
						type="button"
						onClick={deleteArea}
						disabled={saving}
					>
						Delete
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
					<h2 className="text-2xl font-semibold">Projects</h2>
					<p className="text-base-content/60">
						Group related tasks and track their progress.
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
						placeholder="Project name"
						value={projectName}
						onChange={(event) => setProjectName(event.target.value)}
						maxLength={150}
					/>
					<input
						className="input input-bordered"
						placeholder="Description (optional)"
						value={projectDescription}
						onChange={(event) => setProjectDescription(event.target.value)}
						maxLength={1000}
					/>
					<LoadingButton
						className="btn btn-primary"
						onAction={createProject}
						pendingLabel="Creating..."
						disabled={saving || !projectName.trim()}
					>
						Add project
					</LoadingButton>
				</form>
				{projects.length === 0 ? (
					<p className="rounded-box border border-dashed border-base-300 p-6 text-base-content/60">
						No projects yet.
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
					<h2 className="text-2xl font-semibold">Tasks</h2>
					<p className="text-base-content/60">
						All tasks in this area, including project tasks.
					</p>
				</div>
				<div className="rounded-box border border-base-300 bg-base-100 p-4">
					<TaskForm
						areaId={area.id}
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
			<section className="space-y-4">
				<div>
					<h2 className="text-2xl font-semibold">Ideas</h2>
					<p className="text-base-content/60">
						Capture possibilities without turning them into tasks.
					</p>
				</div>
				<div className="rounded-box border border-base-300 bg-base-100 p-4">
					<IdeaForm
						areaId={area.id}
						onCreated={(idea) => setIdeas((current) => [idea, ...current])}
					/>
				</div>
				<IdeaList
					ideas={ideas}
					onChanged={(idea) =>
						setIdeas((current) =>
							current.map((item) => (item.id === idea.id ? idea : item)),
						)
					}
					onDeleted={(id) =>
						setIdeas((current) => current.filter((idea) => idea.id !== id))
					}
				/>
			</section>
		</div>
	);
}
