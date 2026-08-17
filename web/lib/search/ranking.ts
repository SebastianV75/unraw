import type {
	SearchHighlightRange,
	SearchMatchInput,
	SearchSnippet,
} from "./types";
import {
	matchesAllSearchTokens,
	normalizeSearchText,
	tokenizeSearchQuery,
} from "./normalize";

const PROJECT_STATUS_BONUS = {
	active: 10,
	paused: 5,
	completed: 0,
} as const;

function buildNormalizedMap(value: string): {
	normalized: string;
	originalIndexes: number[];
} {
	let normalized = "";
	const originalIndexes: number[] = [];

	for (let index = 0; index < value.length; index += 1) {
		const normalizedCharacter = normalizeSearchText(value[index]);
		for (const character of normalizedCharacter) {
			normalized += character;
			originalIndexes.push(index);
		}
	}

	return { normalized, originalIndexes };
}

export function getHighlightRanges(
	value: string,
	tokens: readonly string[],
): SearchHighlightRange[] {
	const map = buildNormalizedMap(value);
	const ranges: SearchHighlightRange[] = [];

	for (const token of tokens) {
		if (!token) continue;
		let start = map.normalized.indexOf(token);
		while (start >= 0) {
			const end = start + token.length;
			const originalStart = map.originalIndexes[start];
			const originalEnd = map.originalIndexes[end - 1];
			if (originalStart !== undefined && originalEnd !== undefined) {
				ranges.push([originalStart, originalEnd + 1]);
			}
			start = map.normalized.indexOf(token, start + token.length);
		}
	}

	return ranges
		.sort(([left], [right]) => left - right)
		.reduce<SearchHighlightRange[]>((merged, range) => {
			const previous = merged[merged.length - 1];
			if (previous && range[0] <= previous[1]) {
				previous[1] = Math.max(previous[1], range[1]);
			} else {
				merged.push([...range]);
			}
			return merged;
		}, []);
}

export function buildSearchSnippet(
	content: string | null | undefined,
	tokens: readonly string[],
	maxCharacters = 240,
): SearchSnippet | null {
	if (!content?.trim()) return null;

	const lines = content.trim().split(/\r?\n/).filter(Boolean);
	const firstMatchingLine = lines.findIndex((line) =>
		matchesAllSearchTokens(line, tokens),
	);
	const start = firstMatchingLine > 0 ? firstMatchingLine : 0;
	const selectedLines = lines.slice(start, start + 2);
	let text = selectedLines.join("\n").trim();
	if (text.length > maxCharacters) {
		text = `${text.slice(0, maxCharacters - 1).trimEnd()}…`;
	}

	return {
		text,
		highlightRanges: getHighlightRanges(text, tokens),
	};
}

export function calculateSearchScore(
	input: SearchMatchInput,
	query: string,
): number {
	const normalizedQuery = normalizeSearchText(query);
	const tokens = tokenizeSearchQuery(query);
	if (!tokens.length) return 0;

	const normalizedTitle = normalizeSearchText(input.title);
	let baseScore = 0;
	if (normalizedTitle === normalizedQuery) {
		baseScore = 100;
	} else if (normalizedTitle.startsWith(normalizedQuery)) {
		baseScore = 85;
	} else if (matchesAllSearchTokens(input.title, tokens)) {
		baseScore = 70;
	} else if (matchesAllSearchTokens(input.content, tokens)) {
		baseScore = 45;
	} else if (input.dueDateMatch) {
		baseScore = 40;
	}

	const statusBonus = input.projectStatus
		? PROJECT_STATUS_BONUS[input.projectStatus]
		: 0;
	return baseScore + statusBonus;
}
