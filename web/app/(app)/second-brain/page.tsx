"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkdownRenderer } from "@/components/capture/MarkdownRenderer";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import { createClient } from "@/lib/supabase/client";
import type { Area, SecondBrainEntry } from "@/types";

export default function SecondBrainPage() {
	const [entries, setEntries] = useState<SecondBrainEntry[]>([]);
	const [areas, setAreas] = useState<Area[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

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
			const [areaResult, entryResult] = await Promise.all([
				supabase.from("areas").select("*").eq("user_id", user.id).order("name"),
				supabase
					.from("second_brain")
					.select("*")
					.eq("user_id", user.id)
					.order("updated_at", { ascending: false }),
			]);
			if (areaResult.error || entryResult.error)
				setError("No pudimos cargar tu conocimiento guardado.");
			setAreas((areaResult.data ?? []) as Area[]);
			setEntries((entryResult.data ?? []) as SecondBrainEntry[]);
			setLoading(false);
		}
		void load();
	}, []);

	async function deleteEntry(entry: SecondBrainEntry) {
		if (!window.confirm("¿Eliminar esta nota?")) return;
		const { error: deleteError } = await createClient()
			.from("second_brain")
			.delete()
			.eq("id", entry.id)
			.eq("user_id", entry.user_id);
		if (deleteError) {
			setError("No pudimos eliminar la nota. Inténtalo de nuevo.");
			return;
		}
		setEntries((current) => current.filter((item) => item.id !== entry.id));
	}

	const areaNames = new Map(areas.map((area) => [area.id, area.name]));

	return (
		<div className="app-page second-brain-page knowledge-library">
			<header className="knowledge-library-header">
				<div>
					<p className="app-section-kicker">Conocimiento guardado</p>
					<h1>Notas</h1>
					<p>Un espacio para pensar, conservar y volver a tus ideas.</p>
				</div>
				<Link className="btn btn-primary" href="/second-brain/new">
					Nueva nota
				</Link>
			</header>

			{error && (
				<p className="text-sm text-error" role="alert">
					{error}
				</p>
			)}

			<SkeletonSwap
				ready={!loading}
				lines={8}
				reserve={420}
				label="Conocimiento guardado"
			>
				{!loading ? (
					entries.length === 0 ? (
						<div className="knowledge-library-empty">
							<p className="app-section-kicker">Tu espacio está listo</p>
							<h2>Empieza una nota.</h2>
							<p>
								Escribe sin preparar nada. Puedes ordenar el contenido mientras
								escribes.
							</p>
							<Link className="app-text-link" href="/second-brain/new">
								Crear mi primera nota <span aria-hidden="true">↗</span>
							</Link>
						</div>
					) : (
						<div className="knowledge-library-list">
							{entries.map((entry) => (
								<article className="knowledge-library-item" key={entry.id}>
									<Link
										className="knowledge-library-item-link"
										href={`/second-brain/${entry.id}`}
									>
										<div className="knowledge-library-item-meta">
											<span>
												{entry.area_id
													? (areaNames.get(entry.area_id) ?? "Área")
													: "Global"}
											</span>
											<span>
												{new Date(entry.updated_at).toLocaleDateString("es-MX", {
													day: "numeric",
													month: "short",
												})}
											</span>
										</div>
										<h2>{entry.title || "Sin título"}</h2>
										<div className="knowledge-library-item-preview">
											<MarkdownRenderer
												content={entry.content}
												compact
												headingMode="card"
											/>
										</div>
										{entry.tags.length > 0 && (
											<div className="knowledge-library-item-tags">
												{entry.tags.slice(0, 4).map((tag) => (
													<span key={tag}>{tag}</span>
												))}
											</div>
										)}
									</Link>
									<div className="knowledge-library-item-actions">
										<button
											className="app-text-link"
											type="button"
											onClick={() => void deleteEntry(entry)}
										>
											Eliminar
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
