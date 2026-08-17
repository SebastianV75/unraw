"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import ArrowDown2 from "reicon-react/icons/ArrowDown2";
import ArrowRight4 from "reicon-react/icons/ArrowRight4";
import Search from "reicon-react/icons/Search";
import X from "reicon-react/icons/X";
import { SearchResults } from "@/components/navigation/SearchResults";
import { useUnifiedSearch } from "@/components/navigation/useUnifiedSearch";
import type { SearchMode } from "@/lib/search/types";
import { useRouter } from "next/navigation";
const RESULTS_LIST_ID = "command-search-results";

export function CommandPalette() {
	const router = useRouter();
	const launcherRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [mode, setMode] = useState<SearchMode>("compact");
	const { state, results, error } = useUnifiedSearch(query, mode);
	const hasQuery = query.trim().length > 0;
	const busy = state === "loading" || state === "refreshing";

	function close() {
		setOpen(false);
		setQuery("");
		setMode("compact");
		setActiveIndex(0);
		window.requestAnimationFrame(() => launcherRef.current?.focus());
	}

	function openPalette() {
		setOpen(true);
		setActiveIndex(0);
		window.requestAnimationFrame(() => inputRef.current?.focus());
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
		if (!open) return;
		window.requestAnimationFrame(() => inputRef.current?.focus());
	}, [open]);

	useEffect(() => {
		setActiveIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
	}, [results.length]);

	function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown" && results.length > 0) {
			event.preventDefault();
			setActiveIndex((current) => Math.min(current + 1, results.length - 1));
		}
		if (event.key === "ArrowUp" && results.length > 0) {
			event.preventDefault();
			setActiveIndex((current) => Math.max(current - 1, 0));
		}
		if (event.key === "Enter" && results[activeIndex]) {
			event.preventDefault();
			router.push(results[activeIndex].href);
			close();
		}
		if (event.key === "Escape") close();
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
				<Search
					className="command-launcher-icon"
					size={15}
					color="currentColor"
					weight="Outline"
					strokeWidth={1.7}
					aria-hidden="true"
				/>
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
						aria-labelledby="command-search-label"
					>
						<div className="command-search-row">
							<Search
								className="command-search-icon"
								size={17}
								color="currentColor"
								weight="Outline"
								strokeWidth={1.7}
								aria-hidden="true"
							/>
							<label className="sr-only" htmlFor="command-search-input" id="command-search-label">
								Buscar en Unraw
							</label>
							<input
								ref={inputRef}
								id="command-search-input"
								type="search"
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setActiveIndex(0);
								}}
								onKeyDown={handleInputKeyDown}
								placeholder="Buscar tareas, ideas y notas…"
								aria-label="Buscar en Unraw"
								aria-controls={hasQuery ? RESULTS_LIST_ID : undefined}
								aria-activedescendant={
									hasQuery && results[activeIndex]
										? `${RESULTS_LIST_ID}-option-${activeIndex}`
										: undefined
								}
								aria-busy={busy}
							/>
							<button
								className="command-close"
								type="button"
								onClick={close}
								aria-label="Cerrar búsqueda"
							>
								<X
									size={16}
									color="currentColor"
									weight="Outline"
									strokeWidth={1.7}
									aria-hidden="true"
								/>
							</button>
						</div>

						{hasQuery && (
							<>
								{results.length > 0 ? (
									<SearchResults
										results={results}
										activeIndex={activeIndex}
										listId={RESULTS_LIST_ID}
										ariaBusy={busy}
										onActiveIndexChange={setActiveIndex}
										onNavigate={close}
									/>
								) : state === "empty" ? (
									<SearchResults
										results={[]}
										listId={RESULTS_LIST_ID}
										ariaBusy={false}
									/>
								) : state === "loading" ? (
									<p className="command-status" role="status" aria-live="polite">
										Buscando…
									</p>
								) : null}
								{error ? (
									<p className="command-status command-status-error" role="alert">
										{error}
									</p>
								) : null}
								{busy && results.length > 0 ? (
									<p className="command-refreshing" role="status" aria-live="polite">
										Actualizando…
									</p>
								) : null}
								{mode === "compact" && results.length === 8 ? (
									<button
										className="command-expand"
										type="button"
										onClick={() => {
											setMode("all");
											setActiveIndex(0);
										}}
									>
										Ver todos
										<ArrowRight4
											size={14}
											color="currentColor"
											weight="Outline"
											strokeWidth={1.7}
											aria-hidden="true"
										/>
									</button>
								) : null}
							</>
						)}

						<div className="command-footer">
							<span>
								<ArrowDown2
									size={12}
									color="currentColor"
									weight="Outline"
									strokeWidth={1.7}
									aria-hidden="true"
								/> {" "}Navegar
							</span>
							<span>↵ Abrir</span>
							<span>Esc Cerrar</span>
						</div>
					</section>
				</div>
			)}
		</>
	);
}
