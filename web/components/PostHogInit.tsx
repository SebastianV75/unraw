"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const isPostHogConfigured = Boolean(projectToken && apiHost);

if (!projectToken) {
	if (process.env.NODE_ENV === "development") {
		console.error(
			"NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
		);
	}
} else if (!apiHost) {
	if (process.env.NODE_ENV === "development") {
		console.error(
			"NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
		);
	}
} else {
	posthog.init(projectToken, {
		api_host: apiHost,
		defaults: "2026-01-30",
		capture_exceptions: {
			capture_unhandled_errors: true,
			capture_unhandled_rejections: true,
			capture_console_errors: false,
		},
		debug: process.env.NODE_ENV === "development",
	});
}

export function PostHogInit() {
	useEffect(() => {
		if (!isPostHogConfigured) return;

		const {
			data: { subscription },
		} = createClient().auth.onAuthStateChange((event, session) => {
			if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
				posthog.identify(
					session.user.id,
					session.user.email ? { email: session.user.email } : undefined,
				);
			}

			if (event === "SIGNED_OUT") {
				posthog.reset();
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	return null;
}
