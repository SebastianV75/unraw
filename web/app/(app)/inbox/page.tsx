"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import type { Area, InboxItem, Project } from "@/types";
export default function InboxPage() {
	const [items, setItems] = useState<InboxItem[]>([]);
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
	useEffect(() => {
		const supabase = createClient();
		void Promise.all([
			supabase
				.from("inbox_items")
				.select("*")
				.eq("needs_home", true)
				.order("created_at", { ascending: false }),
			supabase.from("areas").select("*").order("name"),
			supabase
				.from("projects")
				.select("*")
				.eq("status", "active")
				.order("name"),
		]).then(([inbox, area, project]) => {
			setItems((inbox.data ?? []) as InboxItem[]);
			setAreas((area.data ?? []) as Area[]);
			setProjects((project.data ?? []) as Project[]);
			if (inbox.error || area.error || project.error)
				setError("No pudimos cargar tu Inbox. Inténtalo de nuevo.");
			setLoading(false);
		});
	}, []);
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
		if (response.ok)
			setItems((current) => current.filter((item) => item.id !== id));
		else setError("No pudimos mover este elemento. Inténtalo de nuevo.");
	}
	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<header>
				<p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
					Inbox
				</p>
				<h1 className="mt-2 text-4xl font-bold">
					Cosas que necesitan un hogar
				</h1>
				<p className="mt-2 text-base-content/70">
					Revisa las capturas que todavía no tienen un área.
				</p>
			</header>
			{error && (
				<p role="alert" className="text-sm text-error">
					{error}
				</p>
			)}
			<SkeletonSwap ready={!loading} lines={6} reserve={300} label="Inbox">
				{!loading ? (
					items.length === 0 ? (
						<p className="rounded-box border border-dashed border-base-300 p-6 text-base-content/60">
							Tu Inbox está despejado.
						</p>
					) : (
						<div className="space-y-3">
							{items.map((item) => (
								<article
									className="rounded-box border border-base-300 bg-base-100 p-5"
									key={item.id}
								>
									<p className="text-xs uppercase tracking-[0.15em] text-base-content/50">
										{item.kind}
									</p>
									<h2 className="mt-2 font-semibold">
										{item.title ?? item.content}
									</h2>
									<p className="mt-2 text-sm text-base-content/70">
										{item.content}
									</p>
									<div className="mt-4 flex flex-wrap gap-2">
										<select
											className="select select-bordered select-sm"
											defaultValue=""
											onChange={(event) =>
												setSelectedAreas((current) => ({
													...current,
													[item.id]: event.target.value,
												}))
											}
											aria-label={`Mover ${item.title ?? item.kind}`}
										>
											<option value="">Elegir un área</option>
											{areas.map((area) => (
												<option value={area.id} key={area.id}>
													{area.name}
												</option>
											))}
										</select>
										{item.kind === "task" && (
											<select
												className="select select-bordered select-sm"
												defaultValue=""
												onChange={(event) =>
													setSelectedProjects((current) => ({
														...current,
														[item.id]: event.target.value,
													}))
												}
												aria-label="Elegir un proyecto"
											>
												<option value="">Elegir un proyecto</option>
												{projects
													.filter(
														(project) =>
															project.area_id === selectedAreas[item.id],
													)
													.map((project) => (
														<option value={project.id} key={project.id}>
															{project.name}
														</option>
													))}
											</select>
										)}
										<button
											className="btn btn-primary btn-sm"
											type="button"
											disabled={!selectedAreas[item.id]}
											onClick={() =>
												void assign(
													item.id,
													selectedAreas[item.id] ?? "",
													selectedProjects[item.id],
												)
											}
										>
											Mover a su hogar
										</button>
									</div>
								</article>
							))}
						</div>
					)
				) : null}
			</SkeletonSwap>
		</div>
	);
}
