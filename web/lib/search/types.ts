export type SearchKind =
	| "task"
	| "idea"
	| "knowledge"
	| "area"
	| "project";

export type SearchMode = "compact" | "all";
export type SearchHighlightRange = [start: number, end: number];

export type SearchResult = {
	id: string;
	kind: SearchKind;
	label: "Tarea" | "Idea" | "Conocimiento" | "Área" | "Proyecto";
	title: string;
	context: string | null;
	snippet: string | null;
	highlightRanges: SearchHighlightRange[];
	dueDate: string | null;
	href: string;
	score: number;
	updatedAt: string;
};

export type SearchResponse = {
	query: string;
	results: SearchResult[];
};

export type SearchRequest = {
	q: string;
	mode: SearchMode;
	dueDate: string | null;
};

export type ParsedSearchQuery = {
	raw: string;
	normalized: string;
	text: string;
	tokens: string[];
	dueDate: string | null;
	datePhrase: string | null;
};

export type SearchMatchInput = {
	title: string;
	content?: string | null;
	dueDate?: string | null;
	dueDateMatch?: boolean;
	projectStatus?: "active" | "paused" | "completed" | null;
};

export type SearchSnippet = {
	text: string;
	highlightRanges: SearchHighlightRange[];
};
