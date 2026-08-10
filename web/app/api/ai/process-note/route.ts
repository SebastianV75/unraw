import { NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import {
	processNote,
	processNoteInputSchema,
	ProcessNoteError,
} from "@/lib/ai/process-note";
import { decryptOpenRouterToken } from "@/lib/security/openrouter-token";

export const runtime = "nodejs";

const FREE_MODEL = "gpt-4.1-nano";
const OPENROUTER_URL = "https://openrouter.ai/api/v1";

function errorResponse(message: string, status: number) {
	return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
	const user = await getUser();
	if (!user) return errorResponse("Authentication is required.", 401);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return errorResponse("The request body must be valid JSON.", 400);
	}
	const parsedInput = processNoteInputSchema.safeParse(body);
	if (!parsedInput.success)
		return errorResponse("The note is invalid or too long.", 400);

	const supabase = await createClient();
	const [
		{ data: profile, error: profileError },
		{ data: areas, error: areasError },
		{ data: projects, error: projectsError },
	] = await Promise.all([
		supabase
			.from("profiles")
			.select("tier, openrouter_token, openrouter_model")
			.eq("id", user.id)
			.single(),
		supabase
			.from("areas")
			.select("id, name")
			.eq("user_id", user.id)
			.order("name"),
		supabase
			.from("projects")
			.select("id, name, area_id")
			.eq("user_id", user.id)
			.order("name"),
	]);
	if (profileError || areasError || projectsError || !profile)
		return errorResponse("Your account context could not be loaded.", 500);

	const context = {
		areas: areas ?? [],
		projects: projects ?? [],
		timezone: parsedInput.data.timezone,
	};
	let apiKey = process.env.OPENAI_API_KEY ?? "";
	let baseURL: string | undefined;
	let model = FREE_MODEL;

	if (profile.tier === "openrouter") {
		if (!profile.openrouter_token || !profile.openrouter_model)
			return errorResponse(
				"OpenRouter is not configured for this account.",
				503,
			);
		try {
			apiKey = decryptOpenRouterToken(profile.openrouter_token);
		} catch {
			return errorResponse(
				"OpenRouter is not configured correctly. Please reconnect it in Settings.",
				503,
			);
		}
		baseURL = OPENROUTER_URL;
		model = profile.openrouter_model;
	} else {
		if (!apiKey) return errorResponse("AI processing is not configured.", 503);
		const { data: usage, error: usageError } = await supabase.rpc(
			"consume_free_capture",
		);
		if (usageError || !usage?.[0])
			return errorResponse("Capture usage could not be updated.", 500);
		if (!usage[0].allowed)
			return errorResponse(
				"You used your 30 captures this month. You can capture again on the first of next month, or connect OpenRouter for unlimited captures.",
				429,
			);
	}

	try {
		const output = await processNote({
			...parsedInput.data,
			user_context: context,
			apiKey,
			baseURL,
			model,
		});
		return NextResponse.json(output);
	} catch (error) {
		if (
			profile.tier === "free" &&
			(error instanceof ProcessNoteError ? error.status >= 500 : true)
		)
			await supabase.rpc("refund_free_capture");
		if (error instanceof ProcessNoteError)
			return errorResponse(error.message, error.status);
		return errorResponse("The note could not be processed.", 500);
	}
}
