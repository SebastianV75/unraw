"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import ArrowDown2 from "reicon-react/icons/ArrowDown2";
import ArrowRight from "reicon-react/icons/ArrowRight";
import ArrowRight4 from "reicon-react/icons/ArrowRight4";
import Search from "reicon-react/icons/Search";
import X from "reicon-react/icons/X";
import { useRouter } from "next/navigation";

type CommandItem = {
	label: string;
	description: string;
	href: string;
	keywords: string;
};

const commands: CommandItem[] = [
	{
		label: "Capturar",
		description: "Escribe una idea nueva",
		href: "/capture",
		keywords: "bandeja nota markdown captura",
	},
	{
		label: "Resumen",
		description: "Mira lo que requiere atención",
		href: "/overview",
		keywords: "tareas hoy tablero resumen",
	},
	{ label: "Inbox", description: "Revisa capturas sin destino", href: "/inbox", keywords: "bandeja sin hogar sin destino" },
	{
		label: "Áreas y proyectos",
		description: "Explora tu sistema",
		href: "/areas",
		keywords: "áreas proyectos trabajo",
	},
	{
		label: "Conocimiento",
		description: "Explora conocimiento guardado",
		href: "/second-brain",
		keywords: "notas conocimiento ideas",
	},
	{
		label: "Configuración",
		description: "Administra tus preferencias",
		href: "/settings",
		keywords: "cuenta preferencias ajustes",
	},
];

export function CommandPalette() {
	const router = useRouter();
	const launcherRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);

	const filteredCommands = commands.filter((command) =>
		`${command.label} ${command.description} ${command.keywords}`
			.toLowerCase()
			.includes(query.toLowerCase()),
	);

	function close() {
		setOpen(false);
		setQuery("");
		window.requestAnimationFrame(() => launcherRef.current?.focus());
	}

	function navigate(href: string) {
		close();
		router.push(href);
	}

	function openPalette() {
		setOpen(true);
		setActiveIndex(0);
	}

	useEffect(() => {
		function handleShortcut(event: globalThis.KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				openPalette();
			}
			if (event.key === "Escape" && open) close();
		}

		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, [open]);

	useEffect(() => {
		if (open) {
			window.requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((current) =>
				Math.min(current + 1, Math.max(filteredCommands.length - 1, 0)),
			);
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((current) => Math.max(current - 1, 0));
		}
		if (event.key === "Enter" && filteredCommands[activeIndex]) {
			event.preventDefault();
			navigate(filteredCommands[activeIndex].href);
		}
	}

	return (
		<>
			<button
				ref={launcherRef}
				className="command-launcher"
				type="button"
				onClick={openPalette}
				aria-haspopup="dialog"
				aria-expanded={open}
				>
						<Search className="command-launcher-icon" size={15} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
					<span>Buscar en Unraw</span>
				<kbd>⌘K</kbd>
			</button>

			{open && (
				<div
					className="command-overlay"
					role="presentation"
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) close();
					}}
				>
					<section
						className="command-dialog"
						role="dialog"
						aria-modal="true"
						aria-labelledby="command-title"
					>
							<div className="command-search-row">
									<Search className="command-search-icon" size={17} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
							<input
								ref={inputRef}
								id="command-title"
								type="search"
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setActiveIndex(0);
								}}
								onKeyDown={handleInputKeyDown}
								placeholder="Buscar páginas…"
								aria-label="Buscar páginas"
							/>
								<button
									className="command-close"
								type="button"
								onClick={close}
									aria-label="Cerrar búsqueda"
								>
										<X size={16} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
							</button>
						</div>
						<div className="command-results" role="listbox" aria-label="Páginas">
							{filteredCommands.length > 0 ? (
								filteredCommands.map((command, index) => (
									<button
										className={`command-result ${index === activeIndex ? "is-active" : ""}`}
										key={command.href}
										type="button"
										role="option"
										aria-selected={index === activeIndex}
										onMouseEnter={() => setActiveIndex(index)}
										onClick={() => navigate(command.href)}
									>
										<span>
											<strong>{command.label}</strong>
											<small>{command.description}</small>
										</span>
											<ArrowRight className="command-result-arrow" size={15} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" />
									</button>
								))
							) : (
								<p className="command-empty">No encontramos páginas.</p>
							)}
						</div>
							<div className="command-footer">
									<span><ArrowDown2 size={12} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" /> Navegar</span>
									<span><ArrowRight4 size={12} color="currentColor" weight="Outline" strokeWidth={1.7} aria-hidden="true" /> Abrir</span>
								<span>Esc Cerrar</span>
						</div>
					</section>
				</div>
			)}
		</>
	);
}
