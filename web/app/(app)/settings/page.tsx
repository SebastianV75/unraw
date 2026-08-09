"use client";

import { useEffect, useState } from "react";
import type { OpenRouterSettings } from "@/types";
import { InlineValidation } from "@/components/interior/inline-validation";
import { LoadingButton } from "@/components/interior/loading-button";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";

export default function SettingsPage() {
	const [apiKey, setApiKey] = useState("");
	const [model, setModel] = useState("openai/gpt-4.1-nano");
	const [configured, setConfigured] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		fetch("/api/settings/openrouter")
			.then(async (response) => {
				const body = (await response.json()) as OpenRouterSettings & {
					error?: string;
				};
				if (!response.ok)
					throw new Error(body.error || "No pudimos cargar la configuración.");
				setConfigured(body.configured);
				setModel(body.model);
			})
			.catch((caught) =>
				setError(
					caught instanceof Error
						? caught.message
						: "No pudimos cargar la configuración.",
				),
			)
			.finally(() => setLoading(false));
	}, []);

	async function save() {
		if (!model.trim() || (!configured && !apiKey.trim())) {
			setError(
				configured
					? "El modelo es necesario."
					: "La clave de API y el modelo son necesarios.",
			);
			return;
		}
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			const response = await fetch("/api/settings/openrouter", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ apiKey: apiKey || undefined, model }),
			});
			const body = (await response.json()) as OpenRouterSettings & {
				error?: string;
			};
			if (!response.ok)
				throw new Error(body.error || "No pudimos guardar la configuración.");
			setConfigured(true);
			setApiKey("");
			setSuccess("Configuración de OpenRouter guardada.");
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "No pudimos guardar la configuración.",
			);
		}
		setSaving(false);
	}

	async function disconnect() {
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			const response = await fetch("/api/settings/openrouter", {
				method: "DELETE",
			});
			const body = (await response.json()) as { error?: string };
			if (!response.ok)
				throw new Error(body.error || "No pudimos desconectar OpenRouter.");
			setConfigured(false);
			setApiKey("");
			setModel("openai/gpt-4.1-nano");
			setSuccess("OpenRouter desconectado.");
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "No pudimos desconectar OpenRouter.",
			);
		}
		setSaving(false);
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8">
			<header>
				<p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
					Cuenta
				</p>
				<h1 className="mt-2 text-4xl font-bold">Configuración</h1>
				<p className="mt-2 text-base-content/70">
					Conecta tu clave de OpenRouter para usar tu propia cuenta al procesar
					capturas.
				</p>
			</header>
			{error && (
				<p
					className="rounded-box bg-error/10 p-4 text-sm text-error"
					role="alert"
				>
					{error}
				</p>
			)}
			{success && (
				<p
					className="rounded-box bg-success/10 p-4 text-sm text-success"
					role="status"
				>
					{success}
				</p>
			)}
			<SkeletonSwap
				ready={!loading}
				lines={6}
				reserve={360}
				label="Configuración"
			>
				{!loading ? (
					<form
						className="space-y-5 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm"
						onSubmit={(event) => {
							event.preventDefault();
							void save();
						}}
					>
						<div>
							<h2 className="text-xl font-semibold">OpenRouter</h2>
							<p className="mt-1 text-sm text-base-content/70">
								{configured
									? "Hay una clave conectada. Escribe una nueva solo si quieres reemplazarla."
									: "Tu clave se cifra antes de guardarse y nunca vuelve a mostrarse."}
							</p>
						</div>
						<InlineValidation
							label="Clave de API"
							type="password"
							autoComplete="off"
							placeholder={
								configured
									? "Déjalo vacío para conservar la clave actual"
									: "sk-or-..."
							}
							value={apiKey}
							onChange={setApiKey}
							maxLength={500}
							validate={(value) =>
								configured && !value
									? null
									: value && !value.startsWith("sk-")
										? "Usa una clave de OpenRouter que empiece por sk-."
										: null
							}
							hint="Tu clave se cifra antes de guardarse."
						/>
						<InlineValidation
							label="Modelo"
							value={model}
							onChange={setModel}
							maxLength={200}
							required
							validate={(value) =>
								value.trim() ? null : "El modelo es necesario."
							}
							hint="Ejemplo: openai/gpt-4.1-nano"
						/>
						<div className="flex flex-wrap justify-between gap-3">
							<LoadingButton
								className="btn btn-primary"
								onAction={save}
								pendingLabel="Guardando…"
								disabled={saving}
							>
								Guardar configuración
							</LoadingButton>
							{configured && (
								<LoadingButton
									className="btn btn-ghost text-error"
									onAction={disconnect}
									pendingLabel="Desconectando…"
									disabled={saving}
								>
									Desconectar OpenRouter
								</LoadingButton>
							)}
						</div>
					</form>
				) : null}
			</SkeletonSwap>
		</div>
	);
}
