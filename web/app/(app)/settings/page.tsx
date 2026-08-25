"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CapturePreference, OpenRouterSettings, ProfileView } from "@/types";
import { DEFAULT_OPENROUTER_MODEL } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/client";
import { InlineValidation } from "@/components/interior/inline-validation";
import { LoadingButton } from "@/components/interior/loading-button";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";

const DELETE_CONFIRMATION = "ELIMINAR MI CUENTA";
type AccountSettings = {
	email: string | null;
	name: string | null;
	capture_preferences: CapturePreference[];
	preferred_view: ProfileView;
};

export default function SettingsPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [accountLoading, setAccountLoading] = useState(true);
	const [capturePreferences, setCapturePreferences] = useState<CapturePreference[]>(["tasks", "ideas"]);
	const [preferredView, setPreferredView] = useState<ProfileView>("list");
	const [accountSaving, setAccountSaving] = useState(false);
	const [deletePhrase, setDeletePhrase] = useState("");
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [model, setModel] = useState(DEFAULT_OPENROUTER_MODEL);
	const [configured, setConfigured] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		fetch("/api/settings/account").then(async (response) => {
			const body = (await response.json()) as AccountSettings & { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos cargar tu cuenta.");
			setEmail(body.email || "");
			setName(body.name || "");
			setCapturePreferences(body.capture_preferences?.length ? body.capture_preferences : ["tasks", "ideas"]);
			setPreferredView(body.preferred_view || "list");
		}).catch((caught) => setError(caught instanceof Error ? caught.message : "No pudimos cargar tu cuenta.")).finally(() => setAccountLoading(false));
		fetch("/api/settings/openrouter").then(async (response) => {
			const body = (await response.json()) as OpenRouterSettings & { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos cargar la configuración.");
			setConfigured(body.configured); setModel(body.model);
		}).catch((caught) => setError(caught instanceof Error ? caught.message : "No pudimos cargar la configuración.")).finally(() => setLoading(false));
	}, []);

	async function saveAccount() {
		setAccountSaving(true); setError(""); setSuccess("");
		try {
			const response = await fetch("/api/settings/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, capture_preferences: capturePreferences, preferred_view: preferredView }) });
			const body = (await response.json()) as Partial<AccountSettings> & { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos guardar tu cuenta.");
			setName(body.name || "");
			setCapturePreferences(body.capture_preferences?.length ? body.capture_preferences : ["tasks", "ideas"]);
			setPreferredView(body.preferred_view || "list");
			setSuccess("Datos de tu cuenta guardados.");
		} catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar tu cuenta."); throw caught; } finally { setAccountSaving(false); }
	}
	async function signOut() { setAccountSaving(true); await createClient().auth.signOut(); router.replace("/login"); }
	async function deleteAccount() {
		setAccountSaving(true); setError("");
		try {
			const response = await fetch("/api/settings/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: deletePhrase }) });
			const body = (await response.json()) as { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos eliminar tu cuenta.");
			await createClient().auth.signOut(); router.replace("/");
		} catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos eliminar tu cuenta."); setAccountSaving(false); }
	}
	async function save() {
		if (!model.trim() || (!configured && !apiKey.trim())) { const message = configured ? "El modelo es necesario." : "La clave de API y el modelo son necesarios."; setError(message); throw new Error(message); }
		setSaving(true); setError(""); setSuccess("");
		try {
			const response = await fetch("/api/settings/openrouter", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: apiKey || undefined, model }) });
			const body = (await response.json()) as OpenRouterSettings & { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos guardar la configuración.");
			setConfigured(true); setApiKey(""); setSuccess("Configuración de OpenRouter guardada.");
		} catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar la configuración."); throw caught; } finally { setSaving(false); }
	}
	async function disconnect() {
		setSaving(true); setError(""); setSuccess("");
		try {
			const response = await fetch("/api/settings/openrouter", { method: "DELETE" }); const body = (await response.json()) as { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos desconectar OpenRouter.");
			setConfigured(false); setApiKey(""); setModel(DEFAULT_OPENROUTER_MODEL); setSuccess("OpenRouter desconectado.");
		} catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos desconectar OpenRouter."); throw caught; } finally { setSaving(false); }
	}

	return <div className="app-page app-settings-page space-y-8">
		<header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cuenta</p><h1 className="mt-2 text-4xl font-bold">Configuración</h1><p className="mt-2 text-base-content/70">Administra tus datos, conexiones y preferencias de cuenta.</p></header>
		{error && <p className="rounded-box bg-error/10 p-4 text-sm text-error" role="alert">{error}</p>}{success && <p className="rounded-box bg-success/10 p-4 text-sm text-success" role="status">{success}</p>}
		<SkeletonSwap ready={!loading && !accountLoading} lines={6} reserve={720} label="Configuración">{!loading && !accountLoading ? <>
			<form className="space-y-5 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); void saveAccount().catch(() => undefined); }}>
				<div><h2 className="text-xl font-semibold">Tu cuenta</h2><p className="mt-1 text-sm text-base-content/70">Actualiza cómo aparece tu perfil dentro de Unraw.</p></div>
				<div><label className="label" htmlFor="account-email"><span className="label-text">Correo electrónico</span></label><input id="account-email" className="input input-bordered w-full" value={email} readOnly aria-readonly="true" /></div>
				<InlineValidation label="Nombre visible" value={name} onChange={setName} maxLength={100} validate={(value) => value.length > 100 ? "El nombre es demasiado largo." : null} hint="Este nombre se mostrará en tu perfil." />
				<fieldset className="space-y-3">
					<legend className="label"><span className="label-text font-semibold">Preferencias de captura</span></legend>
					<p className="text-sm text-base-content/70">Elige qué tipos puede identificar la IA al procesar tus notas.</p>
					<div className="flex flex-wrap gap-4">
						{([
							["tasks", "Tareas"],
							["ideas", "Ideas"],
							["knowledge", "Conocimiento"],
						] as const).map(([value, label]) => (
							<label className="label cursor-pointer gap-2" key={value}>
								<input
									className="checkbox checkbox-primary"
									type="checkbox"
									checked={capturePreferences.includes(value)}
									disabled={
										(capturePreferences.length === 1 && capturePreferences.includes(value)) ||
										(capturePreferences.length === 3 && !capturePreferences.includes(value))
									}
									onChange={() => setCapturePreferences((current) => current.includes(value)
										? current.filter((item) => item !== value)
										: [...current, value])}
								/>
								<span className="label-text">{label}</span>
							</label>
						))}
					</div>
				</fieldset>
				<label className="form-control w-full">
					<span className="label"><span className="label-text font-semibold">Vista predeterminada</span></span>
					<select className="select select-bordered w-full" value={preferredView} onChange={(event) => setPreferredView(event.target.value as ProfileView)}>
						<option value="list">Lista</option>
						<option value="kanban">Kanban</option>
					</select>
				</label>
				<div className="flex flex-wrap justify-between gap-3"><LoadingButton className="btn btn-primary" onAction={saveAccount} pendingLabel="Guardando…" disabled={accountSaving}>Guardar datos</LoadingButton><button type="button" className="btn btn-ghost" onClick={() => void signOut()} disabled={accountSaving}>Cerrar sesión</button></div>
			</form>
			<form className="space-y-5 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); void save().catch(() => undefined); }}>
				<div><h2 className="text-xl font-semibold">OpenRouter</h2><p className="mt-1 text-sm text-base-content/70">{configured ? "Hay una clave conectada. Escribe una nueva solo si quieres reemplazarla." : "Tu clave se cifra antes de guardarse y nunca vuelve a mostrarse."}</p></div>
				<InlineValidation label="Clave de API" type="password" autoComplete="off" placeholder={configured ? "Déjalo vacío para conservar la clave actual" : "sk-or-..."} value={apiKey} onChange={setApiKey} maxLength={500} validate={(value) => configured && !value ? null : value && !value.startsWith("sk-") ? "Usa una clave de OpenRouter que empiece por sk-." : null} hint="Tu clave se cifra antes de guardarse." />
				<InlineValidation label="Modelo" value={model} onChange={setModel} maxLength={200} required validate={(value) => value.trim() ? null : "El modelo es necesario."} hint="Ejemplo: openai/gpt-5-nano" />
				<div className="flex flex-wrap justify-between gap-3"><LoadingButton className="btn btn-primary" onAction={save} pendingLabel="Guardando…" disabled={saving}>Guardar configuración</LoadingButton>{configured && <LoadingButton className="btn btn-ghost text-error" onAction={disconnect} pendingLabel="Desconectando…" disabled={saving}>Desconectar OpenRouter</LoadingButton>}</div>
			</form>
			<section className="space-y-5 rounded-box border border-error/40 bg-error/5 p-6"><div><h2 className="text-xl font-semibold text-error">Zona de peligro</h2><p className="mt-1 text-sm text-base-content/70">Eliminar tu cuenta borra permanentemente tu perfil, áreas, proyectos, tareas, ideas, conocimiento, historial de capturas y datos de Inbox.</p></div><button type="button" className="btn btn-error btn-outline" onClick={() => setDeleteOpen(true)} disabled={accountSaving}>Eliminar mi cuenta</button></section>
		</> : null}</SkeletonSwap>
		{deleteOpen && <dialog open className="modal"><div className="modal-box"><h2 className="text-xl font-bold">¿Eliminar tu cuenta para siempre?</h2><p className="py-4 text-sm text-base-content/70">Esta acción no se puede deshacer. Escribe <strong>{DELETE_CONFIRMATION}</strong> para confirmar la eliminación permanente de todos tus datos.</p><input className="input input-bordered w-full" value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} placeholder={DELETE_CONFIRMATION} autoFocus maxLength={DELETE_CONFIRMATION.length} /><div className="modal-action"><button type="button" className="btn btn-ghost" onClick={() => { setDeleteOpen(false); setDeletePhrase(""); }} disabled={accountSaving}>Cancelar</button><button type="button" className="btn btn-error" onClick={() => void deleteAccount()} disabled={deletePhrase !== DELETE_CONFIRMATION || accountSaving}>Eliminar definitivamente</button></div></div><div className="modal-backdrop"><button type="button" onClick={() => setDeleteOpen(false)}>cerrar</button></div></dialog>}
	</div>;
}
