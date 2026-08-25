export type SaveSummaryCounts = {
	tasks: number;
	ideas: number;
	secondBrain: number;
	suggestions: number;
	inbox: number;
};

export function formatSaveSuccess(
	counts: SaveSummaryCounts,
	existing: boolean,
): string {
	const prefix = existing
		? "Esta captura ya estaba guardada."
		: "Captura guardada correctamente.";
	const categories = [
		counts.tasks > 0 ? `${counts.tasks} ${counts.tasks === 1 ? "tarea" : "tareas"}` : null,
		counts.ideas > 0 ? `${counts.ideas} ${counts.ideas === 1 ? "idea" : "ideas"}` : null,
		counts.secondBrain > 0
			? `${counts.secondBrain} ${counts.secondBrain === 1 ? "nota" : "notas"} de conocimiento`
			: null,
		counts.suggestions > 0
			? `${counts.suggestions} ${counts.suggestions === 1 ? "sugerencia" : "sugerencias"}`
			: null,
	].filter((value): value is string => Boolean(value));
	const saved = categories.length > 0 ? ` Se guardaron ${categories.join(", ")}.` : "";
	const inbox =
		counts.inbox === 0
			? " Inbox quedó vacío."
			: ` ${counts.inbox} ${counts.inbox === 1 ? "elemento quedó" : "elementos quedaron"} en Inbox.`;
	return `${prefix}${saved}${inbox}`;
}
