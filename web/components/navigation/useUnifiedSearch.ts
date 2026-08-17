"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchMode, SearchResult, SearchResponse } from "@/lib/search/types";

export type UnifiedSearchState = "idle" | "loading" | "refreshing" | "success" | "empty" | "error";

export type UnifiedSearchResult = {
	state: UnifiedSearchState;
	results: SearchResult[];
	error: string | null;
};

const SEARCH_ERROR = "No pudimos completar la búsqueda.";

export function useUnifiedSearch(
	query: string,
	mode: SearchMode = "compact",
): UnifiedSearchResult {
	const [state, setState] = useState<UnifiedSearchState>("idle");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [error, setError] = useState<string | null>(null);
	const resultsRef = useRef(results);
	const requestIdRef = useRef(0);
	const controllerRef = useRef<AbortController | null>(null);

	resultsRef.current = results;

	useEffect(() => {
		const normalizedQuery = query.trim();
		const requestId = ++requestIdRef.current;
		controllerRef.current?.abort();
		controllerRef.current = null;

		if (!normalizedQuery) {
			setState("idle");
			setResults([]);
			setError(null);
			return;
		}

		setState(resultsRef.current.length > 0 ? "refreshing" : "loading");
		setError(null);

		const timeout = window.setTimeout(async () => {
			const controller = new AbortController();
			controllerRef.current = controller;

			try {
				const response = await fetch(
					`/api/search?q=${encodeURIComponent(normalizedQuery)}&mode=${mode}`,
					{ signal: controller.signal },
				);
				if (!response.ok) throw new Error(SEARCH_ERROR);

				const payload = (await response.json()) as Partial<SearchResponse>;
				if (!Array.isArray(payload.results)) throw new Error(SEARCH_ERROR);
				if (requestId !== requestIdRef.current) return;

				const nextResults = payload.results as SearchResult[];
				setResults(nextResults);
				setState(nextResults.length > 0 ? "success" : "empty");
				setError(null);
			} catch (cause) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) return;
				setState("error");
				setError(SEARCH_ERROR);
			}
		}, 250);

		return () => {
			window.clearTimeout(timeout);
			controllerRef.current?.abort();
		};
	}, [mode, query]);

	return { state, results, error };
}
