import type { CaptureOutput } from "@/types";

export function getCaptureReviewState(
	result: CaptureOutput,
	rejectedItems: Record<string, boolean>,
	approvedSuggestionCount: number,
) {
	const originallyEmpty =
		result.tasks.length === 0 &&
		result.ideas.length === 0 &&
		result.second_brain.length === 0;
	const remainingResultCount =
		result.tasks.filter((_, index) => !rejectedItems[`task:${index}`]).length +
		result.ideas.filter((_, index) => !rejectedItems[`idea:${index}`]).length +
		result.second_brain.filter(
			(_, index) => !rejectedItems[`knowledge:${index}`],
		).length;

	return {
		originallyEmpty,
		emptyAfterManualDiscard:
			!originallyEmpty && remainingResultCount === 0 && approvedSuggestionCount === 0,
		remainingResultCount,
	};
}
