"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Search from "reicon-react/icons/Search";
import { SearchResults } from "@/components/navigation/SearchResults";
import { useUnifiedSearch } from "@/components/navigation/useUnifiedSearch";
import type { SearchResult } from "@/lib/search/types";

const RESULTS_LIST_ID = "search-page-results";

export default function SearchPage() {
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [recentResults, setRecentResults] = useState<SearchResult[]>([]);
	const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
	const { state, results, error } = useUnifiedSearch(query, "all");
	const hasQuery = query.trim().length > 0;
	const busy = state === "loading" || state === "refreshing";

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (state !== "success") return;
		setRecentResults(results);
		setHasCompletedSearch(true);
	}, [results, state]);

	useEffect(() => {
		setActiveIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
	}, [results.length]);

	function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown" && visibleResults.length > 0) {
			event.preventDefault();
			setActiveIndex((current) =>
				Math.min(current + 1, visibleResults.length - 1),
			);
		}
		if (event.key === "ArrowUp" && visibleResults.length > 0) {
			event.preventDefault();
			setActiveIndex((current) => Math.max(current - 1, 0));
		}
		if (event.key === "Enter" && visibleResults[activeIndex]) {
			event.preventDefault();
			window.location.assign(visibleResults[activeIndex].href);
		}
	}

	const showingRecent = !hasQuery && hasCompletedSearch;
	const visibleResults = showingRecent ? recentResults : results;
	const shouldRenderResults = showingRecent || state === "success" || state === "empty" || results.length > 0;

	return (
		<div className="app-page search-page">
			<header className="app-page-header search-page-header">
				<div>
					<p className="app-page-kicker">Recuperar</p>
					<h1>Buscar</h1>
					<p className="search-page-lead">
						Encuentra lo que ya guardaste en todo Unraw.
					</p>
				</div>
			</header>

			<section className="search-page-panel" aria-label="Búsqueda global">
				<div className="search-page-input-row">
					<Search
						size={19}
						color="currentColor"
						weight="Outline"
						strokeWidth={1.7}
						aria-hidden="true"
					/>
					<input
						ref={inputRef}
						id="search-page-input"
						type="search"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setActiveIndex(0);
						}}
						onKeyDown={handleInputKeyDown}
						placeholder="Buscar tareas, ideas, notas, áreas y proyectos…"
						aria-label="Buscar en todo Unraw"
						aria-controls={shouldRenderResults ? RESULTS_LIST_ID : undefined}
						aria-activedescendant={
							visibleResults[activeIndex]
								? `${RESULTS_LIST_ID}-option-${activeIndex}`
								: undefined
						}
						aria-busy={busy}
					/>
					{busy ? (
						<span className="search-input-progress" aria-hidden="true">
							<span className="search-spinner" />
						</span>
					) : null}
				</div>

				{!hasQuery && !hasCompletedSearch ? (
					<p className="search-page-explanation">
						Busca tareas, ideas, notas, áreas y proyectos en todo Unraw.
					</p>
				) : null}
				{showingRecent ? <p className="search-section-label">Resultados recientes</p> : null}
				{state === "loading" && !results.length && hasQuery ? (
					<p className="search-status" role="status" aria-live="polite">
						Buscando…
					</p>
				) : null}
				{busy && results.length > 0 && hasQuery ? (
					<p className="search-refreshing" role="status" aria-live="polite">
						Actualizando…
					</p>
				) : null}
				{error ? (
					<p className="search-status search-status-error" role="alert">
						{error}
					</p>
				) : null}
				{shouldRenderResults ? (
					<SearchResults
						results={visibleResults}
						activeIndex={activeIndex}
						listId={RESULTS_LIST_ID}
						ariaBusy={busy}
						onActiveIndexChange={setActiveIndex}
					/>
				) : null}
			</section>
		</div>
	);
}
