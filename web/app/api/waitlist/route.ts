import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const waitlistInputSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(254),
	website: z.string().max(200).optional(),
});

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
	return (
		request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}

function isRateLimited(key: string) {
	const now = Date.now();
	const current = attempts.get(key);

	if (!current || current.resetAt <= now) {
		attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}

	current.count += 1;
	return current.count > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
	if (Number(request.headers.get("content-length") || 0) > 4096) {
		return NextResponse.json(
			{ error: "La solicitud es demasiado grande." },
			{ status: 413 },
		);
	}

	if (isRateLimited(getClientKey(request))) {
		return NextResponse.json(
			{ error: "Demasiados intentos. Intenta de nuevo más tarde." },
			{ status: 429 },
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		body = null;
	}
	const parsed = waitlistInputSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Escribe un email válido." },
			{ status: 400 },
		);
	}

	// Honeypot: return the same success response without persisting automated submissions.
	if (parsed.data.website?.trim()) {
		return NextResponse.json({ ok: true });
	}

	try {
		const supabase = await createClient();
		const { error } = await supabase
			.from("waitlist")
			.insert({ email: parsed.data.email });

		// A duplicate email is already registered, so keep the response idempotent.
		if (error && error.code !== "23505") {
			return NextResponse.json(
				{ error: "No pudimos registrarte. Intenta de nuevo." },
				{ status: 500 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json(
			{ error: "El servicio no está disponible. Intenta de nuevo más tarde." },
			{ status: 503 },
		);
	}
}
