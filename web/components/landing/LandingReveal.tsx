"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
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
	const visible = useInView(ref, { once: true, margin: "-64px" });
	const reduced = useReducedMotion();
	const [motionReady, setMotionReady] = useState(false);

	useEffect(() => {
		setMotionReady(true);
	}, []);

	const hidden = { clipPath: "inset(0 0 100% 0)", opacity: 0.82 };
	const shown = { clipPath: "inset(0 0 0 0)", opacity: 1 };

	return (
		<motion.div
			ref={ref}
			className={className}
			initial={false}
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
				willChange: motionReady && !reduced ? "clip-path, opacity" : undefined,
			}}
		>
			{children}
		</motion.div>
	);
}
