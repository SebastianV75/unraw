"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type LandingRevealProps = {
	children: ReactNode;
	className?: string;
	delay?: number;
};

const REVEAL_EASE = [0.77, 0, 0.175, 1] as const;
const UI_EASE = [0.23, 1, 0.32, 1] as const;

export function LandingReveal({
	children,
	className = "",
	delay = 0,
}: LandingRevealProps) {
	const ref = useRef<HTMLDivElement>(null);
	const reduced = useReducedMotion();
	const [visible, setVisible] = useState(false);
	const [motionReady, setMotionReady] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (reduced || typeof IntersectionObserver === "undefined" || !node) {
			setVisible(true);
			setMotionReady(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				setVisible(true);
				observer.disconnect();
			},
			{ rootMargin: "0px 0px -64px 0px", threshold: 0.01 },
		);

		observer.observe(node);
		setMotionReady(true);
		return () => observer.disconnect();
	}, [reduced]);

	const hidden = {
		clipPath: "inset(0 0 100% 0)",
		opacity: 0.82,
		transform: "translateY(18px)",
	};
	const shown = {
		clipPath: "inset(0 0 0 0)",
		opacity: 1,
		transform: "translateY(0px)",
	};

	return (
		<div ref={ref} className={className}>
			<motion.div
				initial={reduced ? false : hidden}
				animate={
					!motionReady
						? undefined
						: reduced
							? { opacity: 1 }
							: visible
								? shown
								: hidden
				}
				transition={
					reduced
						? { duration: 0.2, ease: UI_EASE }
						: { duration: 0.6, delay, ease: REVEAL_EASE }
				}
				style={{
					willChange:
						motionReady && !reduced
							? "clip-path, opacity, transform"
							: undefined,
				}}
			>
				{children}
			</motion.div>
		</div>
	);
}
