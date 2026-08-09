export function getSafeNextPath(
	value: string | null | undefined,
	fallback = "/overview",
) {
	if (
		!value ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	) {
		return fallback;
	}

	try {
		const parsed = new URL(value, "http://localhost");
		return parsed.origin === "http://localhost" ? value : fallback;
	} catch {
		return fallback;
	}
}
