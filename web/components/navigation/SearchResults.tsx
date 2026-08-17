"use client";

import type { SearchResult } from "@/lib/search/types";
import { SearchResultRow } from "@/components/navigation/SearchResultRow";

type SearchResultsProps = {
	results: SearchResult[];
	activeIndex?: number;
	listId: string;
	ariaLabel?: string;
	ariaBusy?: boolean;
	onActiveIndexChange?: (index: number) => void;
	onNavigate?: () => void;
};

export function SearchResults({
	results,
	activeIndex = -1,
	listId,
	ariaLabel = "Resultados de búsqueda",
	ariaBusy = false,
	onActiveIndexChange,
	onNavigate,
}: SearchResultsProps) {
	return (
		<div
			className="search-results"
			id={listId}
			role="listbox"
			aria-label={ariaLabel}
			aria-busy={ariaBusy}
		>
			{results.length > 0 ? (
				results.map((result, index) => (
					<SearchResultRow
						key={`${result.kind}-${result.id}`}
						id={`${listId}-option-${index}`}
						result={result}
						active={index === activeIndex}
						onActivate={() => onActiveIndexChange?.(index)}
						onNavigate={onNavigate}
					/>
				))
			) : (
				<p className="search-results-empty" role="status">
					No encontramos resultados para esta búsqueda.
				</p>
			)}
		</div>
	);
}
