"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { SearchHighlightRange, SearchResult } from "@/lib/search/types";

type SearchResultRowProps = {
	result: SearchResult;
	active?: boolean;
	id?: string;
	onActivate?: () => void;
	onNavigate?: () => void;
};

function formatDueDate(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return value;
	return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(
		new Date(year, month - 1, day),
	);
}

function highlightedText(text: string, ranges: SearchHighlightRange[]) {
	if (ranges.length === 0) return text;
	const safeRanges = ranges
		.map(([start, end]) => [Math.max(0, start), Math.min(text.length, end)] as const)
		.filter(([start, end]) => end > start)
		.sort(([startA], [startB]) => startA - startB);
	const parts: ReactNode[] = [];
	let cursor = 0;

	for (const [start, end] of safeRanges) {
		const boundedStart = Math.max(start, cursor);
		if (boundedStart > cursor) parts.push(text.slice(cursor, boundedStart));
		if (end > boundedStart) {
			parts.push(
				<mark key={`${boundedStart}-${end}`} className="search-result-highlight">
					{text.slice(boundedStart, end)}
				</mark>,
			);
			cursor = end;
		}
	}
	if (cursor < text.length) parts.push(text.slice(cursor));
	return parts;
}

export function SearchResultRow({
	result,
	active = false,
	id,
	onActivate,
	onNavigate,
}: SearchResultRowProps) {
	const snippet = result.snippet ?? null;
	const snippetSource = snippet ?? result.title;

	return (
		<Link
			id={id}
			className={`search-result-row ${active ? "is-active" : ""}`}
			href={result.href}
			role="option"
			aria-selected={active}
			data-kind={result.kind}
			onMouseEnter={onActivate}
			onFocus={onActivate}
			onClick={onNavigate}
		>
			<span className="search-result-main">
				<strong className="search-result-title">{result.title}</strong>
				<span className="search-result-meta">
					<span>{result.label}</span>
					{result.context ? <span>{result.context}</span> : null}
				</span>
				{snippet ? (
					<span className="search-result-snippet">
						{highlightedText(snippetSource, result.highlightRanges)}
					</span>
				) : null}
			</span>
			{result.dueDate ? (
				<time className="search-result-due" dateTime={result.dueDate}>
					{formatDueDate(result.dueDate)}
				</time>
			) : null}
		</Link>
	);
}
