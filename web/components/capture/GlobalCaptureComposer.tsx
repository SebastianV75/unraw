"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { createIdempotencyKey } from "@/lib/captures/idempotency";
import { canStartCaptureSave, shouldSubmitCaptureOnEnter } from "./quick-capture-interaction";

export class CaptureHttpError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "CaptureHttpError";
		this.status = status;
	}
}

export async function parseCaptureResponse(response: Response): Promise<unknown> {
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		throw new CaptureHttpError(
			response.status,
			`El servidor devolvió una respuesta no válida (HTTP ${response.status}).`,
		);
	}
	if (!response.ok) {
		const message =
			typeof body === "object" &&
			body !== null &&
			"error" in body &&
			typeof body.error === "string"
				? body.error
				: `No pudimos guardar la captura (HTTP ${response.status}).`;
		throw new CaptureHttpError(response.status, message);
	}
	return body;
}

export function captureErrorMessage(error: unknown) {
	if (error instanceof CaptureHttpError) return error.message;
	if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
	return error instanceof Error ? error.message : "No pudimos guardar la captura.";
}
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
	const [mounted, setMounted] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const savingRef = useRef(false);

	useEffect(() => setMounted(true), []);

	function openFrom(opener: HTMLElement | null) {
		openerRef.current = opener;
		setStatus("");
		setOpen(true);
	}

	function close() {
		if (dialogRef.current?.open) dialogRef.current.close();
		else setOpen(false);
	}

	function restoreFocus() {
		const opener = openerRef.current;
		if (opener?.isConnected && opener.getClientRects().length > 0 && !opener.closest("[inert]")) {
			opener.focus();
		}
	}

	useEffect(() => {
		if (!open || !mounted) return;
		const dialog = dialogRef.current;
		if (!dialog || dialog.open) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		dialog.showModal();
		textareaRef.current?.focus();
		return () => {
			if (dialog.open) dialog.close();
			document.body.style.overflow = previousOverflow;
		};
	}, [open, mounted]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (!open && isGlobalCaptureShortcut(event)) {
				event.preventDefault();
				openFrom(document.activeElement instanceof HTMLElement ? document.activeElement : null);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open]);

	async function save() {
		const rawNote = note.trim();
		if (!canStartCaptureSave(rawNote, savingRef.current)) return;
		savingRef.current = true;
		setSaving(true);
		setStatus("Guardando en Inbox…");
		try {
			const response = await fetch("/api/captures/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idempotency_key: createIdempotencyKey(), raw_note: rawNote, confirmed_output: { tasks: [], ideas: [], second_brain: [], suggestions: [] }, assignments: {}, fallback_to_inbox: true }),
			});
			await parseCaptureResponse(response);
			setNote((current) => current.trim() === rawNote ? "" : current);
			setStatus("Guardado en Inbox");
			requestAnimationFrame(() => textareaRef.current?.focus());
		} catch (error) {
			setStatus(captureErrorMessage(error));
		} finally {
			savingRef.current = false;
			setSaving(false);
		}
	}

	return (
		<>
			<button ref={triggerRef} type="button" className="global-capture-trigger" onClick={(event) => openFrom(event.currentTarget)} aria-haspopup="dialog" aria-expanded={open}>
				<span className="global-capture-trigger-label">Captura rápida</span> <kbd>⌘⇧Espacio</kbd>
			</button>
			{mounted && open && createPortal(
				<dialog ref={dialogRef} className="global-capture-overlay" aria-labelledby="global-capture-title" aria-describedby="global-capture-description" onClose={() => { setOpen(false); requestAnimationFrame(restoreFocus); }} onClick={(event) => { if (event.target !== event.currentTarget) return; const panel = event.currentTarget.querySelector(".global-capture-dialog")?.getBoundingClientRect(); if (!panel || event.clientX < panel.left || event.clientX > panel.right || event.clientY < panel.top || event.clientY > panel.bottom) close(); }}>
					<section className="global-capture-dialog">
						<header className="global-capture-header">
							<div className="global-capture-heading">
								<span className="global-capture-mark" aria-hidden="true">＋</span>
								<div>
									<p className="global-capture-eyebrow">Captura rápida</p>
									<h2 id="global-capture-title">Escribe y sigue</h2>
								</div>
							</div>
							<button type="button" className="global-capture-close" onClick={close} aria-label="Cerrar captura">×</button>
						</header>
						<p id="global-capture-description" className="global-capture-description">Guarda una nota directamente en Inbox, sin ordenar.</p>
						<textarea ref={textareaRef} value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (shouldSubmitCaptureOnEnter(event.nativeEvent)) { event.preventDefault(); void save(); } }} placeholder="Escribe lo que tienes en mente…" aria-label="Nota rápida" maxLength={12000} disabled={saving} />
						<footer className="global-capture-actions">
							<span className="global-capture-status" role="status" aria-live="polite">{status}</span>
							<div className="global-capture-command-hints" aria-label="Atajos de teclado">
								<span><kbd>Enter</kbd> guardar</span>
								<span><kbd>Shift+Enter</kbd> salto</span>
							</div>
							<button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={!note.trim() || saving}>{saving ? "Guardando…" : "Guardar"}</button>
						</footer>
					</section>
				</dialog>,
				document.body,
			)}
		</>
	);
}

