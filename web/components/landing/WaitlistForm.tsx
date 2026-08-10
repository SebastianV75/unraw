"use client";

import { InlineValidation } from "@/components/interior/inline-validation";
import { LoadingButton } from "@/components/interior/loading-button";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import Check3 from "reicon-react/icons/Check3";

type WaitlistFormProps = {
	buttonLabel: string;
	placeholder: string;
	successMessage: string;
};

const SUCCESS_EASE = [0.23, 1, 0.32, 1] as const;

function validateEmail(value: string) {
	const email = value.trim().toLowerCase();
	if (!email) return "Escribe tu email.";
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
		? null
		: "Escribe un email válido.";
}

export function WaitlistForm({
	buttonLabel,
	placeholder,
	successMessage,
}: WaitlistFormProps) {
	const [email, setEmail] = useState("");
	const [website, setWebsite] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const reduced = useReducedMotion();

	async function submit() {
		const normalizedEmail = email.trim().toLowerCase();
		const validationError = validateEmail(normalizedEmail);

		setError("");
		if (validationError) {
			throw new Error(validationError);
		}

		const response = await fetch("/api/waitlist", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: normalizedEmail, website }),
		});
		const result = (await response.json()) as { error?: string };

		if (!response.ok) {
			const message =
				result.error || "No pudimos registrarte. Intenta de nuevo.";
			setError(message);
			throw new Error(message);
		}

		setSuccess(true);
		setEmail("");
	}

	if (success) {
		return (
			<motion.div
				className="landing-waitlist-confirmation"
				role="status"
				aria-live="polite"
				initial={
					reduced
						? { opacity: 0 }
						: { opacity: 0, transform: "translateY(8px)", filter: "blur(2px)" }
				}
				animate={{
					opacity: 1,
					transform: "translateY(0px)",
					filter: "blur(0px)",
				}}
				transition={
					reduced
						? { duration: 0.2, ease: SUCCESS_EASE }
						: { duration: 0.32, ease: SUCCESS_EASE }
				}
			>
				<span className="landing-waitlist-confirmation-icon" aria-hidden="true">
					<Check3
						size={22}
						color="currentColor"
						weight="Outline"
						strokeWidth={1.8}
					/>
				</span>
				<div className="landing-waitlist-confirmation-copy">
					<span className="landing-pixel-label">ACCESO RESERVADO</span>
					<h3>Ya estás en la lista.</h3>
					<p>{successMessage}</p>
				</div>
				<p className="landing-waitlist-confirmation-note">
					Puedes volver a lo tuyo.
				</p>
			</motion.div>
		);
	}

	return (
		<form
			className="landing-waitlist-form"
			onSubmit={(event) => {
				event.preventDefault();
				event.currentTarget
					.querySelector<HTMLButtonElement>("button[type=submit]")
					?.click();
			}}
			noValidate
		>
			<div className="landing-waitlist-field">
				<InlineValidation
					className="landing-waitlist-input"
					label="Tu email"
					id="waitlist-email"
					name="email"
					type="email"
					value={email}
					onChange={(value) => {
						setEmail(value);
						setError("");
					}}
					validate={validateEmail}
					hint="Te avisaremos cuando abramos el acceso."
					placeholder={placeholder}
					autoComplete="email"
					maxLength={254}
					required
				/>
				<LoadingButton
					type="submit"
					className="landing-waitlist-submit"
					onAction={submit}
					onErrorAction={(actionError: unknown) => {
						if (validateEmail(email.trim().toLowerCase())) return;
						if (!error) {
							setError(
								actionError instanceof Error
									? actionError.message
									: "No pudimos registrarte.",
							);
						}
					}}
					pendingLabel="Guardando..."
					successLabel="Listo"
					errorLabel="Reintentar"
				>
					{buttonLabel}
				</LoadingButton>
			</div>
			<input
				className="landing-waitlist-honeypot"
				name="website"
				type="text"
				value={website}
				onChange={(event) => setWebsite(event.target.value)}
				tabIndex={-1}
				autoComplete="off"
				aria-hidden="true"
			/>
			{error && (
				<p className="landing-waitlist-error" role="alert">
					{error}
				</p>
			)}
			<p className="landing-waitlist-note">
				Sin spam. Solo novedades importantes.
			</p>
		</form>
	);
}
