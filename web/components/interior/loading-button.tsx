"use client";

// Adapted from Interior (MIT): https://github.com/ddoemonn/interior
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import Loader from "reicon-react/icons/Loader";
import Alert from "reicon-react/icons/Alert";
import Check3 from "reicon-react/icons/Check3";

const CROSSFADE = {
	type: "spring",
	stiffness: 260,
	damping: 34,
	mass: 0.8,
} as const;
const INSTANT = { duration: 0 } as const;

export type AsyncActionStatus = "idle" | "pending" | "success" | "error";

export type UseAsyncActionOptions = {
	action: () => unknown;
	resetAfter?: number;
	onErrorAction?: (error: unknown) => void;
};

export function useAsyncAction({
	action,
	resetAfter = 1400,
	onErrorAction,
}: UseAsyncActionOptions) {
	const [status, setStatus] = useState<AsyncActionStatus>("idle");
	const phase = useRef<AsyncActionStatus>("idle");
	const runId = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const alive = useRef(true);
	const actionRef = useRef(action);
	const errorRef = useRef(onErrorAction);

	useEffect(() => {
		actionRef.current = action;
		errorRef.current = onErrorAction;
	});

	const clear = useCallback(() => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	}, []);

	const run = useCallback(() => {
		if (phase.current === "pending") return;
		clear();
		const id = ++runId.current;
		phase.current = "pending";
		setStatus("pending");

		const settle = (next: "success" | "error") => {
			if (!alive.current || id !== runId.current) return;
			phase.current = next;
			setStatus(next);
			timer.current = setTimeout(() => {
				if (!alive.current || id !== runId.current) return;
				phase.current = "idle";
				setStatus("idle");
			}, resetAfter);
		};

		Promise.resolve()
			.then(() => actionRef.current())
			.then(
				() => settle("success"),
				(error: unknown) => {
					errorRef.current?.(error);
					settle("error");
				},
			);
	}, [clear, resetAfter]);

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			clear();
		};
	}, [clear]);

	return { status, run, pending: status === "pending" };
}

export type LoadingButtonProps = Omit<
	ComponentProps<typeof motion.button>,
	"children" | "onClick"
> & {
	onAction: () => unknown;
	children: string;
	pendingLabel?: string;
	successLabel?: string;
	errorLabel?: string;
	resetAfter?: number;
	onErrorAction?: (error: unknown) => void;
};

export function LoadingButton({
	onAction,
	children,
	pendingLabel = children,
	successLabel = "Done",
	errorLabel = "Try again",
	resetAfter = 1400,
	onErrorAction,
	className = "",
	type = "button",
	disabled = false,
	...buttonProps
}: LoadingButtonProps) {
	const reduced = useReducedMotion();
	const { status, run, pending } = useAsyncAction({
		action: onAction,
		resetAfter,
		onErrorAction,
	});
	const label =
		status === "pending"
			? pendingLabel
			: status === "success"
				? successLabel
				: status === "error"
					? errorLabel
					: children;
	const fade = reduced ? INSTANT : CROSSFADE;
	const faces: { key: AsyncActionStatus; text: string; icon: ReactNode }[] = [
		{ key: "idle", text: children, icon: null },
		{
			key: "pending",
			text: pendingLabel,
			icon: (
				<Loader
					size={13}
					color="currentColor"
					weight="Outline"
					strokeWidth={1.7}
				/>
			),
		},
		{
			key: "success",
			text: successLabel,
			icon: (
				<Check3
					size={13}
					color="currentColor"
					weight="Outline"
					strokeWidth={1.7}
				/>
			),
		},
		{
			key: "error",
			text: errorLabel,
			icon: (
				<Alert
					size={13}
					color="currentColor"
					weight="Outline"
					strokeWidth={1.7}
				/>
			),
		},
	];

	return (
		<>
			<motion.button
				{...buttonProps}
				type={type}
				disabled={disabled || pending}
				aria-label={label}
				aria-busy={pending || undefined}
				whileTap={disabled || pending || reduced ? undefined : { y: 1 }}
				onClick={(event) => {
					event.preventDefault();
					run();
				}}
				className={`relative inline-flex min-h-10 select-none items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 text-[13px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:bg-[var(--bg-hover)] focus-visible:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
				style={{ touchAction: "manipulation", ...buttonProps.style }}
				transition={fade}
			>
				<span aria-hidden className="relative grid min-w-0 place-items-center">
					{faces.map((face) => (
						<motion.span
							key={face.key}
							initial={false}
							animate={
								face.key === status
									? { opacity: 1, y: 0, filter: "blur(0px)" }
									: { opacity: 0, y: 3, filter: "blur(3px)" }
							}
							transition={fade}
							className={`col-start-1 row-start-1 flex items-center justify-center gap-1.5 whitespace-nowrap ${face.key === "success" ? "text-[var(--success)]" : face.key === "error" ? "text-[var(--danger)]" : "text-current"}`}
						>
							{face.key === "pending" ? (
								<motion.span
									animate={reduced ? undefined : { rotate: 360 }}
									transition={
										reduced
											? undefined
											: { duration: 0.85, repeat: Infinity, ease: "linear" }
									}
									className="inline-flex"
								>
									{face.icon}
								</motion.span>
							) : (
								face.icon
							)}
							{face.text}
						</motion.span>
					))}
				</span>
			</motion.button>
			<span role="status" aria-live="polite" className="sr-only">
				{status === "success"
					? successLabel
					: status === "error"
						? errorLabel
						: ""}
			</span>
		</>
	);
}
