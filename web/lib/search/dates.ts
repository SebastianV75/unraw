import type { ParsedSearchQuery } from "./types";
import { normalizeSearchText, tokenizeSearchQuery } from "./normalize";

const MONTHS = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];

const WEEKDAYS = [
	"domingo",
	"lunes",
	"martes",
	"miercoles",
	"jueves",
	"viernes",
	"sabado",
];

function padDatePart(value: number): string {
	return String(value).padStart(2, "0");
}

function formatLocalDate(date: Date): string {
	return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function createLocalDate(year: number, month: number, day: number): Date | null {
	const date = new Date(year, month, day);
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month ||
		date.getDate() !== day
	) {
		return null;
	}
	return date;
}

function dateFromWeekday(weekday: string, now: Date): Date | null {
	const target = WEEKDAYS.indexOf(weekday);
	if (target < 0) return null;

	const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const daysUntil = (target - date.getDay() + 7) % 7;
	date.setDate(date.getDate() + daysUntil);
	return date;
}

function findDateMatch(
	normalizedQuery: string,
	now: Date,
): { phrase: string; date: string } | null {
	const isoMatch = normalizedQuery.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
	if (isoMatch) {
		const date = createLocalDate(
			Number(isoMatch[1]),
			Number(isoMatch[2]) - 1,
			Number(isoMatch[3]),
		);
		if (date) return { phrase: isoMatch[0], date: formatLocalDate(date) };
	}

	const relativeMatch = normalizedQuery.match(/\b(hoy|manana)\b/);
	if (relativeMatch) {
		const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		if (relativeMatch[1] === "manana") date.setDate(date.getDate() + 1);
		return { phrase: relativeMatch[0], date: formatLocalDate(date) };
	}

	const monthPattern = MONTHS.join("|");
	const monthMatch = normalizedQuery.match(
		new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${monthPattern})\\b`),
	);
	if (monthMatch) {
		const month = MONTHS.indexOf(monthMatch[2]);
		const date = createLocalDate(now.getFullYear(), month, Number(monthMatch[1]));
		if (date) return { phrase: monthMatch[0], date: formatLocalDate(date) };
	}

	const weekdayPattern = WEEKDAYS.slice(0, 7).join("|");
	const weekdayMatch = normalizedQuery.match(
		new RegExp(`\\b(${weekdayPattern})\\b`),
	);
	if (weekdayMatch) {
		const date = dateFromWeekday(weekdayMatch[1], now);
		if (date) return { phrase: weekdayMatch[0], date: formatLocalDate(date) };
	}

	return null;
}

export function parseSearchQuery(
	query: string,
	now: Date = new Date(),
): ParsedSearchQuery {
	const raw = query;
	const normalized = normalizeSearchText(query);
	const dateMatch = findDateMatch(normalized, now);
	const text = normalizeSearchText(
		dateMatch ? normalized.replace(dateMatch.phrase, " ") : normalized,
	);

	return {
		raw,
		normalized,
		text,
		tokens: tokenizeSearchQuery(text),
		dueDate: dateMatch?.date ?? null,
		datePhrase: dateMatch?.phrase ?? null,
	};
}
