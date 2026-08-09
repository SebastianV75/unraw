"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { InlineValidation } from "@/components/interior/inline-validation";
import { LoadingButton } from "@/components/interior/loading-button";

type AreaDraft = { name: string; projects: string[] };

const initialAreas: AreaDraft[] = [
	{ name: "", projects: [] },
	{ name: "", projects: [] },
	{ name: "", projects: [] },
];

export default function OnboardingPage() {
	const router = useRouter();
	const [areas, setAreas] = useState(initialAreas);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	function updateAreaName(index: number, value: string) {
		setAreas((current) =>
			current.map((area, areaIndex) =>
				areaIndex === index ? { ...area, name: value } : area,
			),
		);
	}

	function addProject(areaIndex: number) {
		setAreas((current) =>
			current.map((area, index) =>
				index === areaIndex
					? { ...area, projects: [...area.projects, ""] }
					: area,
			),
		);
	}

	function updateProject(
		areaIndex: number,
		projectIndex: number,
		value: string,
	) {
		setAreas((current) =>
			current.map((area, index) =>
				index === areaIndex
					? {
							...area,
							projects: area.projects.map((project, currentProjectIndex) =>
								currentProjectIndex === projectIndex ? value : project,
							),
						}
					: area,
			),
		);
	}

	function removeProject(areaIndex: number, projectIndex: number) {
		setAreas((current) =>
			current.map((area, index) =>
				index === areaIndex
					? {
							...area,
							projects: area.projects.filter(
								(_, currentProjectIndex) =>
									currentProjectIndex !== projectIndex,
							),
						}
					: area,
			),
		);
	}

	function addArea() {
		if (areas.length < 5)
			setAreas((current) => [...current, { name: "", projects: [] }]);
	}

 async function handleSubmit() {
		const validAreas = areas.map((area) => ({
			name: area.name.trim(),
			projects: area.projects.map((project) => project.trim()),
		}));
		if (validAreas.length < 3) {
			setError("Añade al menos tres áreas para continuar.");
			return;
		}
		if (validAreas.some((area) => !area.name)) {
			setError("Ponle un nombre a cada área antes de continuar.");
			return;
		}
		if (validAreas.some((area) => area.projects.some((project) => !project))) {
			setError("Ponle un nombre a cada proyecto antes de continuar.");
			return;
		}
		if (
			validAreas.some((area) => {
				const projects = area.projects.map((project) => project.toLowerCase());
				return new Set(projects).size !== projects.length;
			})
		) {
			setError("Los proyectos deben tener nombres distintos dentro de cada área.");
			return;
		}

		setLoading(true);
		setError("");
		const supabase = createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();
		if (userError || !user) {
			setError("Tu sesión terminó. Vuelve a entrar para continuar.");
			setLoading(false);
			return;
		}

		const { error: profileError } = await supabase
			.from("profiles")
			.upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });
		if (profileError) {
			setError("No pudimos preparar tu perfil. Inténtalo de nuevo.");
			setLoading(false);
			return;
		}

		const insertedAreas: { id: string }[] = [];
		for (const area of validAreas) {
			const { data: insertedArea, error: areasError } = await supabase
				.from("areas")
				.insert({ user_id: user.id, name: area.name })
				.select("id")
				.single();
			if (areasError || !insertedArea) {
				setError("No pudimos guardar tus áreas. Inténtalo de nuevo.");
				setLoading(false);
				return;
			}
			insertedAreas.push(insertedArea);
		}

		const projects = validAreas.flatMap((area, index) =>
			area.projects.map((project) => ({
				user_id: user.id,
				area_id: insertedAreas[index].id,
				name: project,
			})),
		);
		if (projects.length > 0) {
			const { error: projectsError } = await supabase
				.from("projects")
				.insert(projects);
			if (projectsError) {
				setError(
					"Tus áreas se guardaron, pero algunos proyectos no pudieron crearse. Inténtalo de nuevo.",
				);
				setLoading(false);
				return;
			}
		}

		const { error: updateError } = await supabase
			.from("profiles")
			.update({ onboarding_completed: true })
			.eq("id", user.id);
		if (updateError) {
			setError(
				"Guardamos tu configuración, pero no pudimos terminarla. Inténtalo de nuevo.",
			);
			setLoading(false);
			return;
		}

		router.replace("/capture");
	}

	return (
		<main className="onboarding-page">
			<section className="onboarding-card">
				<p className="onboarding-label">Unraw · Primer paso</p>
				<h1>Deja preparada tu base.</h1>
				<p className="onboarding-lead">
					Solo necesitamos unas pocas áreas para ordenar lo que venga. Puedes empezar con tres y cambiarlo después.
				</p>
				<form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
					{areas.map((area, index) => (
						<div className="onboarding-area" key={index}>
							<InlineValidation label={`Área ${index + 1}`} placeholder="Trabajo, salud, personal..." required value={area.name} onChange={(value) => updateAreaName(index, value)} validate={(value) => value.trim() ? null : "Añade un nombre para el área."} />
							<div className="mt-4 space-y-3">
								{area.projects.map((project, projectIndex) => (
									<div className="flex gap-2" key={projectIndex}>
										<InlineValidation className="flex-1" label={`Proyecto ${projectIndex + 1}`} placeholder="Proyecto actual" value={project} onChange={(value) => updateProject(index, projectIndex, value)} validate={(value) => value.trim() ? null : "Añade un nombre para el proyecto."} />
										<button
											className="btn btn-ghost"
											type="button"
											onClick={() => removeProject(index, projectIndex)}
										>
											Quitar
										</button>
									</div>
								))}
								<button
									className="btn btn-outline btn-sm"
									type="button"
									onClick={() => addProject(index)}
								>
									Añadir proyecto
								</button>
							</div>
						</div>
					))}
					{areas.length < 5 && (
						<button className="btn btn-ghost" type="button" onClick={addArea}>
							+ Añadir otra área
						</button>
					)}
					{error && (
						<p className="text-sm text-error" role="alert">
							{error}
						</p>
					)}
					<LoadingButton className="btn btn-primary w-full" onAction={handleSubmit} pendingLabel="Guardando tu base..." disabled={loading}>Guardar y continuar</LoadingButton>
				</form>
			</section>
		</main>
	);
}
