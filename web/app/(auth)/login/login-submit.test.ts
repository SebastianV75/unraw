import { describe, expect, it, vi } from "vitest";
import {
	LoginServiceError,
	submitEmailLogin,
} from "./login-submit";

function client(error: unknown = null) {
	return {
		auth: {
			signInWithPassword: vi.fn(async () => ({ error })),
		},
	};
}

describe("submitEmailLogin", () => {
	it("rejects invalid credentials before creating a client", async () => {
		const createClient = vi.fn();

		await expect(
			submitEmailLogin({
				email: "not-an-email",
				password: "",
				createClient,
				onSuccess: vi.fn(),
			}),
		).resolves.toBe("invalid");
		expect(createClient).not.toHaveBeenCalled();
	});

	it("keeps Supabase auth errors as credential failures", async () => {
		const supabase = client({ message: "Invalid login credentials" });

		await expect(
			submitEmailLogin({
				email: "user@example.com",
				password: "secret",
				createClient: () => supabase,
				onSuccess: vi.fn(),
			}),
		).resolves.toBe("credentials-error");
	});

	it("sanitizes client or network rejection", async () => {
		const secret = "NEXT_PUBLIC_SUPABASE_ANON_KEY=secret";

		await expect(
			submitEmailLogin({
				email: "user@example.com",
				password: "secret",
				createClient: () => {
					throw new Error(secret);
				},
				onSuccess: vi.fn(),
			}),
		).rejects.toBeInstanceOf(LoginServiceError);
		await expect(
			submitEmailLogin({
				email: "user@example.com",
				password: "secret",
				createClient: () => {
					throw new Error(secret);
				},
				onSuccess: vi.fn(),
			}),
		).rejects.toThrow("LOGIN_SERVICE_UNAVAILABLE");
	});

	it("sanitizes sign-in transport rejection", async () => {
		const supabase = {
			auth: {
				signInWithPassword: vi.fn(async () => {
					throw new Error("network secret");
				}),
			},
		};

		await expect(
			submitEmailLogin({
				email: "user@example.com",
				password: "secret",
				createClient: () => supabase,
				onSuccess: vi.fn(),
			}),
		).rejects.toBeInstanceOf(LoginServiceError);
	});

	it("calls success only after a successful sign-in", async () => {
		const onSuccess = vi.fn();
		const supabase = client();

		await expect(
			submitEmailLogin({
				email: "user@example.com",
				password: "secret",
				createClient: () => supabase,
				onSuccess,
			}),
		).resolves.toBe("success");
		expect(onSuccess).toHaveBeenCalledOnce();
	});
});
