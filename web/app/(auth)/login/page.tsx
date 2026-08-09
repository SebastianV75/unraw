"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSafeNextPath } from "@/lib/utils";
import { InlineValidation } from "@/components/interior/inline-validation";
import { LoadingButton } from "@/components/interior/loading-button";

function LoginForm() {
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(
		searchParams.get("error")
			? "La autenticación falló. Inténtalo de nuevo."
			: "",
	);
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		if (!/\S+@\S+\.\S+/.test(email) || !password) {
			setError("Escribe un email y una contraseña válidos.");
			return;
		}
		setLoading(true);
		setError("");

		const { error: authError } = await createClient().auth.signInWithPassword({
			email,
			password,
		});
		if (authError) {
			setError("No pudimos iniciar sesión con esos datos.");
			setLoading(false);
			return;
		}

		window.location.assign(getSafeNextPath(searchParams.get("next")));
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-base-200 px-4 py-12">
			<section className="w-full max-w-md rounded-box bg-base-100 p-8 shadow-xl">
				<p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
					Unraw
				</p>
				<h1 className="mb-2 text-3xl font-bold">Qué bueno verte.</h1>
				<p className="mb-8 text-base-content/70">
					Inicia sesión para seguir organizando lo que tienes en mente.
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
						autoComplete="current-password"
						required
						value={password}
						onChange={setPassword}
						validate={(value) => (value ? null : "Escribe tu contraseña.")}
					/>
					{error && (
						<p className="text-sm text-error" role="alert">
							{error}
						</p>
					)}
					<LoadingButton
						className="btn btn-primary w-full"
						onAction={handleSubmit}
						pendingLabel="Iniciando sesión…"
						disabled={loading}
					>
						Iniciar sesión
					</LoadingButton>
				</form>
				<p className="mt-6 text-center text-sm text-base-content/70">
					¿Aún no tienes cuenta?{" "}
					<Link
						className="link link-primary"
						href={`/register?next=${encodeURIComponent(getSafeNextPath(searchParams.get("next")))}`}
					>
						Crear una
					</Link>
				</p>
			</section>
		</main>
	);
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}
