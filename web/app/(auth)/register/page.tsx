"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSafeNextPath } from "@/lib/utils";
import { InlineValidation } from "@/components/interior/inline-validation";
import { LoadingButton } from "@/components/interior/loading-button";
import GoogleButton from "@/components/auth/GoogleButton";

function RegisterForm() {
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		if (!/\S+@\S+\.\S+/.test(email) || password.length < 6) {
			setError(
				"Escribe un email válido y una contraseña de al menos 6 caracteres.",
			);
			return;
		}
		setLoading(true);
		setError("");
		setMessage("");

		const { data, error: authError } = await createClient().auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getSafeNextPath(searchParams.get("next")))}`,
			},
		});

		if (authError) {
			setError(
				"No pudimos crear la cuenta. Revisa tus datos e inténtalo de nuevo.",
			);
			setLoading(false);
			return;
		}

		if (data.session) {
			window.location.assign(getSafeNextPath(searchParams.get("next")));
			return;
		}

		setMessage(
			"Cuenta creada. Revisa tu email para confirmarla antes de iniciar sesión.",
		);
		setLoading(false);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-base-200 px-4 py-12">
			<section className="w-full max-w-md rounded-box bg-base-100 p-8 shadow-xl">
				<p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
					Unraw
				</p>
				<h1 className="mb-2 text-3xl font-bold">Empieza sin ordenar.</h1>
				<p className="mb-8 text-base-content/70">
					Crea tu cuenta y deja que Unraw haga el trabajo pesado.
				</p>
				<form
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						void handleSubmit();
					}}
				>
					<InlineValidation
						label="Email"
						type="email"
						autoComplete="email"
						required
						value={email}
						onChange={setEmail}
						validate={(value) =>
							/\S+@\S+\.\S+/.test(value) ? null : "Escribe un email válido."
						}
					/>
					<InlineValidation
						label="Contraseña"
						type="password"
						autoComplete="new-password"
						required
						value={password}
						onChange={setPassword}
						minLength={6}
						validate={(value) =>
							value.length >= 6 ? null : "Usa al menos 6 caracteres."
						}
					/>
					{error && (
						<p className="text-sm text-error" role="alert">
							{error}
						</p>
					)}
					{message && (
						<p className="text-sm text-success" role="status">
							{message}
						</p>
					)}
					<LoadingButton
						className="btn btn-primary w-full"
						onAction={handleSubmit}
						pendingLabel="Creando cuenta…"
						disabled={loading}
					>
						Crear cuenta
					</LoadingButton>
				</form>
				<div className="my-5 flex items-center gap-3 text-xs text-base-content/50">
					<span className="h-px flex-1 bg-base-300" />
					<span>o continúa con</span>
					<span className="h-px flex-1 bg-base-300" />
				</div>
				<GoogleButton next={getSafeNextPath(searchParams.get("next"))} />
				<p className="mt-6 text-center text-sm text-base-content/70">
					¿Ya tienes una cuenta?{" "}
					<Link
						className="link link-primary"
						href={`/login?next=${encodeURIComponent(getSafeNextPath(searchParams.get("next")))}`}
					>
						Iniciar sesión
					</Link>
				</p>
			</section>
		</main>
	);
}

export default function RegisterPage() {
	return (
		<Suspense>
			<RegisterForm />
		</Suspense>
	);
}
