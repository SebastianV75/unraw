"use client";

import { useEffect, useRef, useState } from "react";
import { createIdempotencyKey } from "@/lib/captures/idempotency";

function isEditableTarget(target: EventTarget | null) {
	return typeof HTMLElement !== "undefined" && target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

export function isGlobalCaptureShortcut(event: Pick<KeyboardEvent, "metaKey" | "ctrlKey" | "shiftKey" | "key" | "code" | "repeat" | "target">) {
	return !event.repeat && (event.metaKey || event.ctrlKey) && event.shiftKey && (event.code === "Space" || event.key === " ") && !isEditableTarget(event.target);
}

export function GlobalCaptureComposer() {
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState("");
	const [status, setStatus] = useState("");
	const [saving, setSaving] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	function close() {
		setOpen(false);
		requestAnimationFrame(() => triggerRef.current?.focus());
	}

	useEffect(() => {
		if (!open) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [open]);

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if (isGlobalCaptureShortcut(event)) {
				event.preventDefault();
				setOpen(true);
				setStatus("");
				requestAnimationFrame(() => textareaRef.current?.focus());
			} else if (event.key === "Escape" && open) {
				event.preventDefault();
				close();
			}
		}
		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, [open]);

	async function save() {
		const rawNote = note.trim();
		if (!rawNote || saving) return;
		setSaving(true);
		setStatus("Guardando en Inbox…");
		try {
			const response = await fetch("/api/captures/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idempotency_key: createIdempotencyKey(), raw_note: rawNote, confirmed_output: { tasks: [], ideas: [], second_brain: [], suggestions: [] }, assignments: {}, fallback_to_inbox: true }),
			});
			const body = (await response.json()) as { error?: string };
			if (!response.ok) throw new Error(body.error || "No pudimos guardar la captura.");
			setNote("");
			setStatus("Guardado en Inbox");
			requestAnimationFrame(() => textareaRef.current?.focus());
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "No pudimos guardar la captura.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<>
			<button ref={triggerRef} type="button" className="global-capture-trigger" onClick={() => { setOpen(true); requestAnimationFrame(() => textareaRef.current?.focus()); }} aria-haspopup="dialog" aria-expanded={open}>
				<span className="global-capture-trigger-label">Captura rápida</span> <kbd>⌘⇧Espacio</kbd>
			</button>
			{open && (
				<div className="global-capture-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
					<section className="global-capture-dialog" role="dialog" aria-modal="true" aria-labelledby="global-capture-title" aria-describedby="global-capture-description">
						<header className="global-capture-header">
							<div className="global-capture-heading">
								<span className="global-capture-mark" aria-hidden="true">＋</span>
								<div>
									<p className="global-capture-eyebrow">Captura rápida</p>
									<h2 id="global-capture-title">Escribe y sigue</h2>
								</div>
							</div>
							<kbd className="global-capture-escape">Esc</kbd>
						</header>
						<p id="global-capture-description" className="global-capture-description">Guarda una nota directamente en Inbox, sin ordenar.</p>
						<textarea ref={textareaRef} value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void save(); } }} placeholder="Escribe lo que tienes en mente…" aria-label="Nota rápida" maxLength={12000} disabled={saving} />
						<footer className="global-capture-actions">
							<span className="global-capture-status" role="status" aria-live="polite">{status}</span>
							<div className="global-capture-command-hints" aria-label="Atajos de teclado">
								<span><kbd>Enter</kbd> guardar</span>
								<span><kbd>Shift+Enter</kbd> salto</span>
							</div>
							<button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={!note.trim() || saving}>{saving ? "Guardando…" : "Guardar"}</button>
						</footer>
					</section>
				</div>
			)}
		</>
	);
}

