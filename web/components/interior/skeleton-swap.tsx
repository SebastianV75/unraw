"use client";

// Adapted from Interior (MIT): https://github.com/ddoemonn/interior
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const CROSSFADE = {
	type: "spring",
	stiffness: 260,
	damping: 34,
	mass: 0.8,
} as const;
const WIDTHS = [100, 93, 97, 88, 95, 91] as const;

function widthFor(index: number, total: number) {
	if (total > 1 && index === total - 1) return 62;
	return WIDTHS[(index * 7 + 3) % WIDTHS.length];
}

export type UseSkeletonSwapOptions = {
	ready: boolean;
	delay?: number;
	minVisible?: number;
};
function useSkeletonSwap({
	ready,
	delay = 120,
	minVisible = 380,
}: UseSkeletonSwapOptions) {
	const [visible, setVisible] = useState(false);
	const shownAt = useRef(0);
	useEffect(() => {
		if (!ready) {
			if (visible) return;
			const timer = setTimeout(() => {
				shownAt.current = performance.now();
				setVisible(true);
			}, delay);
			return () => clearTimeout(timer);
		}
		if (!visible) return;
		const rest = Math.max(
			0,
			minVisible - (performance.now() - shownAt.current),
		);
		const timer = setTimeout(() => setVisible(false), rest);
		return () => clearTimeout(timer);
	}, [delay, minVisible, ready, visible]);
	return { showSkeleton: visible, busy: !ready };
}

export type SkeletonSwapProps = {
	ready: boolean;
	children: ReactNode;
	lines?: number;
	lineHeight?: number;
	barHeight?: number;
	reserve?: number;
	delay?: number;
	minVisible?: number;
	label?: string;
	skeleton?: ReactNode;
	className?: string;
};

export function SkeletonSwap({
	ready,
	children,
	lines = 3,
	lineHeight = 21,
	barHeight = 9,
	reserve,
	delay = 120,
	minVisible = 380,
	label,
	skeleton,
	className = "",
}: SkeletonSwapProps) {
	const { showSkeleton } = useSkeletonSwap({ ready, delay, minVisible });
	const reduced = useReducedMotion();
	const box = reserve ?? lines * lineHeight;

	return (
		<div
			aria-busy={!ready}
			aria-label={label}
			style={{ minHeight: box }}
			className={`relative grid overflow-visible text-[var(--text-primary)] ${className}`}
		>
			<motion.div
				className="col-start-1 row-start-1 min-w-0"
				initial={false}
				animate={
					reduced
						? { opacity: showSkeleton ? 0 : 1 }
						: {
								opacity: showSkeleton ? 0 : 1,
								scale: showSkeleton ? 0.99 : 1,
								filter: showSkeleton ? "blur(4px)" : "blur(0px)",
							}
				}
				transition={reduced ? { duration: 0 } : CROSSFADE}
				style={{
					transformOrigin: "top left",
					pointerEvents: showSkeleton ? "none" : undefined,
				}}
			>
				{children}
			</motion.div>
			<AnimatePresence initial={false}>
				{showSkeleton ? (
					<motion.div
						key="skeleton"
						aria-hidden
						className="pointer-events-none col-start-1 row-start-1 w-full self-start"
						initial={reduced ? { opacity: 1 } : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={
							reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(3px)" }
						}
						transition={reduced ? { duration: 0 } : CROSSFADE}
					>
						{skeleton ?? (
							<div className="w-full">
								{Array.from({ length: lines }, (_, index) => (
									<div
										key={index}
										className="flex items-center"
										style={{ height: lineHeight }}
									>
										<div
											className="rounded-[4px] bg-[var(--border)]"
											style={{
												height: barHeight,
												width: `${widthFor(index, lines)}%`,
											}}
										/>
									</div>
								))}
							</div>
						)}
					</motion.div>
				) : null}
			</AnimatePresence>
			{label ? (
				<span role="status" className="sr-only">
					{ready ? `${label} loaded` : ""}
				</span>
			) : null}
		</div>
	);
}
