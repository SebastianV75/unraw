export function removeDiacritics(value: string): string {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSearchText(value: string): string {
	return removeDiacritics(value)
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}

export function tokenizeSearchQuery(value: string): string[] {
	const normalized = normalizeSearchText(value);
	return normalized ? normalized.split(" ").filter(Boolean) : [];
}

export function matchesAllSearchTokens(
	value: string | null | undefined,
	tokens: readonly string[],
): boolean {
	if (!tokens.length) return false;
	const normalized = normalizeSearchText(value ?? "");
	return tokens.every((token) => normalized.includes(token));
}
