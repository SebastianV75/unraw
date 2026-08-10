"use client";

import ArrowLeft4 from "reicon-react/icons/ArrowLeft4";
import ArrowRight4 from "reicon-react/icons/ArrowRight4";
import Check3 from "reicon-react/icons/Check3";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InlineValidation } from "@/components/interior/inline-validation";
import { LoadingButton } from "@/components/interior/loading-button";
import { createClient } from "@/lib/supabase/client";
import type { CapturePreference } from "@/types";

type CaptureChoice = { id: CapturePreference; label: string; description: string };

const captureChoices: CaptureChoice[] = [
	{ id: "tasks", label: "Tareas", description: "Cosas que necesitan acción" },
	{ id: "ideas", label: "Ideas", description: "Posibilidades que quieres conservar" },
	{ id: "knowledge", label: "Conocimiento", description: "Aprendizajes y referencias" },
];

const suggestedAreas = ["Trabajo", "Personal", "Salud", "Finanzas", "Estudios"];

export default function OnboardingPage() {
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [name, setName] = useState("");
	const [areas, setAreas] = useState<string[]>(["Trabajo", "Personal"]);
	const [customArea, setCustomArea] = useState("");
	const [capturePreferences, setCapturePreferences] = useState<CapturePreference[]>([
		"tasks",
		"ideas",
	]);
	const [activeProject, setActiveProject] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	function toggleArea(area: string) {
		setAreas((current) =>
			current.includes(area)
				? current.filter((item) => item !== area)
				: current.length < 5
					? [...current, area]
					: current,
		);
	}

	function addCustomArea() {
		const value = customArea.trim();
		if (!value || areas.includes(value) || areas.length >= 5) return;
		setAreas((current) => [...current, value]);
		setCustomArea("");
	}

	function toggleCapturePreference(preference: CapturePreference) {
		setCapturePreferences((current) =>
			current.includes(preference)
				? current.filter((item) => item !== preference)
				: [...current, preference],
		);
	}

	function nextStep() {
		setError("");
		if (step === 1 && areas.length === 0) {
			setError("Elige al menos un área para empezar.");
			return;
		}
		if (step === 2 && capturePreferences.length === 0) {
			setError("Elige al menos un tipo de captura.");
			return;
		}
		setStep((current) => Math.min(current + 1, 2));
	}

	async function finish() {
		if (areas.length === 0 || capturePreferences.length === 0) {
			setError("Completa las opciones necesarias antes de continuar.");
			return;
		}
		setLoading(true);
		setError("");
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			setError("Tu sesión terminó. Vuelve a entrar para continuar.");
			setLoading(false);
			return;
		}

		const { data: existingAreas, error: areaLoadError } = await supabase
			.from("areas")
			.select("name")
			.eq("user_id", user.id);
		if (areaLoadError) {
			setError("No pudimos preparar tu sistema. Inténtalo de nuevo.");
			setLoading(false);
			return;
		}
		const existingNames = new Set(
			(existingAreas ?? []).map((area) => area.name.toLowerCase()),
		);
		const newAreaNames = areas.filter((area) => !existingNames.has(area.toLowerCase()));
		const { error: profileError } = await supabase.from("profiles").upsert(
			{
				id: user.id,
				email: user.email ?? null,
				name: name.trim() || null,
				capture_preferences: capturePreferences,
				onboarding_draft: { active_project: activeProject.trim() || null },
			},
			{ onConflict: "id" },
		);
		if (profileError) {
			setError("No pudimos guardar tus preferencias. Inténtalo de nuevo.");
			setLoading(false);
			return;
		}
		let insertedAreaId: string | null = null;
		if (newAreaNames.length > 0) {
			const { data: insertedAreas, error: insertError } = await supabase
				.from("areas")
				.insert(newAreaNames.map((area) => ({ user_id: user.id, name: area })))
				.select("id, name");
			if (insertError || !insertedAreas) {
				setError("No pudimos crear tus áreas. Inténtalo de nuevo.");
				setLoading(false);
				return;
			}
			insertedAreaId = insertedAreas[0]?.id ?? null;
		}
		if (activeProject.trim() && insertedAreaId) {
			await supabase.from("projects").insert({
				user_id: user.id,
				area_id: insertedAreaId,
				name: activeProject.trim(),
			});
		}
		const { error: completeError } = await supabase
			.from("profiles")
			.update({ onboarding_completed: true })
			.eq("id", user.id);
		if (completeError) {
			setError("Guardamos tu base, pero no pudimos terminarla. Inténtalo de nuevo.");
			setLoading(false);
			return;
		}
		router.replace("/capture");
	}

	return (
		<main className="onboarding-v2">
			<section className="onboarding-v2-panel" aria-labelledby="onboarding-title">
				<header className="onboarding-v2-header">
					<div>
						<p className="app-page-kicker">Primeros pasos · {step + 1} de 3</p>
						<h1 id="onboarding-title">Preparemos tu espacio.</h1>
						<p>No necesitas construir un sistema perfecto. Solo dejar una puerta abierta.</p>
					</div>
					<div className="onboarding-v2-progress" aria-label={`Paso ${step + 1} de 3`}>
						{[0, 1, 2].map((item) => (
							<span className={item <= step ? "is-active" : ""} key={item} />
						))}
					</div>
				</header>

				<div className="onboarding-v2-content">
					{step === 0 && (
						<div className="onboarding-v2-step">
							<p className="onboarding-v2-question-label">Una cosa rápida</p>
							<h2>¿Cómo quieres que te llamemos?</h2>
							<p>Lo usaremos para que Hoy se sienta tuyo. Puedes dejarlo vacío.</p>
							<InlineValidation
								label="Tu nombre"
								placeholder="Daniela"
								value={name}
								onChange={setName}
								maxLength={80}
								hint="Opcional"
								validate={() => null}
							/>
						</div>
					)}
					{step === 1 && (
						<div className="onboarding-v2-step">
							<p className="onboarding-v2-question-label">Tu contexto</p>
							<h2>¿Qué quieres tener a mano?</h2>
							<p>Elige hasta cinco áreas. Podrás cambiarlas cuando quieras.</p>
							<div className="onboarding-v2-chips">
								{suggestedAreas.map((area) => (
									<button
										className={areas.includes(area) ? "is-selected" : ""}
										key={area}
										type="button"
										onClick={() => toggleArea(area)}
									>
										{areas.includes(area) && <Check3 size={14} color="currentColor" weight="Outline" aria-hidden="true" />}
										{area}
									</button>
								))}
							</div>
							<div className="onboarding-v2-custom-row">
								<InlineValidation
									label="Otra área"
									placeholder="Familia, clientes..."
									value={customArea}
									onChange={setCustomArea}
									maxLength={80}
									validate={() => null}
								/>
								<button className="app-secondary-action" type="button" onClick={addCustomArea} disabled={!customArea.trim()}>
									Añadir
								</button>
							</div>
							<p className="onboarding-v2-count">{areas.length} de 5 áreas seleccionadas</p>
						</div>
					)}
					{step === 2 && (
						<div className="onboarding-v2-step">
							<p className="onboarding-v2-question-label">Tu forma de capturar</p>
							<h2>¿Qué suele llegar a tu cabeza?</h2>
							<p>Esto ayuda a que Unraw entienda qué ordenar primero.</p>
							<div className="onboarding-v2-choice-list">
								{captureChoices.map((choice) => (
									<button
										className={capturePreferences.includes(choice.id) ? "is-selected" : ""}
										key={choice.id}
										type="button"
										onClick={() => toggleCapturePreference(choice.id)}
									>
										<span>{choice.label}</span>
										<small>{choice.description}</small>
									</button>
								))}
							</div>
							<InlineValidation
								label="¿Tienes un proyecto activo?"
								placeholder="Rediseñar mi web"
								value={activeProject}
								onChange={setActiveProject}
								maxLength={150}
								hint="Opcional · lo añadiremos a la primera área"
								validate={() => null}
							/>
						</div>
					)}
				</div>

				{error && <p className="app-alert app-alert-error" role="alert">{error}</p>}

				<footer className="onboarding-v2-footer">
					{step > 0 ? (
						<button className="app-secondary-action" type="button" onClick={() => setStep((current) => current - 1)}>
							<ArrowLeft4 size={15} color="currentColor" weight="Outline" aria-hidden="true" />
							Atrás
						</button>
					) : <span />}
					{step < 2 ? (
						<button className="app-primary-action" type="button" onClick={nextStep}>
							Continuar <ArrowRight4 size={15} color="currentColor" weight="Outline" aria-hidden="true" />
						</button>
					) : (
						<LoadingButton
							className="app-primary-action"
							onAction={finish}
							pendingLabel="Preparando…"
							disabled={loading}
						>
							Ir a mi captura
						</LoadingButton>
					)}
				</footer>
			</section>
		</main>
	);
}
