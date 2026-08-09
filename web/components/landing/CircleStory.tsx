"use client";

import Link from "next/link";
import {
	motion,
	useMotionTemplate,
	useMotionValue,
	useReducedMotion,
	useScroll,
	useSpring,
	useTransform,
	type MotionValue,
} from "motion/react";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

const STORY_EASE = [0.77, 0, 0.175, 1] as const;

const chapters = [
	{
		index: "01",
		title: "Suelta.",
		body: "Escribe la idea incompleta, la tarea urgente o eso que no quieres olvidar.",
	},
	{
		index: "02",
		title: "Nosotros procesamos.",
		body: "Unraw absorbe el ruido y entiende qué necesita acción y qué merece quedarse.",
	},
	{
		index: "03",
		title: "Todo encuentra lugar.",
		body: "Tareas, ideas y notas salen claras, listas para volver a tu propio sistema.",
	},
	{
		index: "04",
		title: "Respira.",
		body: "Ya está guardado. No tienes que ordenar nada más ahora.",
	},
] as const;

const rawFragments = [
	{ text: "llamar al contador", x: -300, y: -150, rotate: -5, delay: 0 },
	{ text: "contrato · jueves", x: 285, y: -175, rotate: 4, delay: 0.025 },
	{ text: "idea newsletter", x: -330, y: 115, rotate: 3, delay: 0.045 },
	{ text: "no olvidar", x: 0, y: 235, rotate: 2, delay: 0.085 },
] as const;

const clearItems = [
	{
		type: "TAREA",
		text: "Llamar al contador mañana",
		x: 335,
		y: -175,
		delay: 0,
	},
	{
		type: "TAREA",
		text: "Revisar el contrato antes del jueves",
		x: 390,
		y: 0,
		delay: 0.035,
	},
	{
		type: "IDEA",
		text: "Newsletter mensual para clientes",
		x: 330,
		y: 175,
		delay: 0.07,
	},
] as const;

type ProgressProps = { progress: MotionValue<number> };

type StoryChapterProps = ProgressProps & {
	chapter: (typeof chapters)[number];
	times: [number, number, number, number];
	hold?: boolean;
};

function StoryChapter({
	progress,
	chapter,
	times,
	hold = false,
}: StoryChapterProps) {
	const opacity = useTransform(
		progress,
		times,
		hold ? [0, 1, 1, 1] : [0, 1, 1, 0],
	);
	const y = useTransform(
		progress,
		times,
		hold ? [28, 0, 0, 0] : [28, 0, 0, -28],
	);
	const transform = useMotionTemplate`translate3d(0, ${y}px, 0)`;

	return (
		<motion.article
			className="landing-circle-chapter"
			style={{ opacity, transform }}
		>
			<span className="landing-pixel-label">{chapter.index} / 04</span>
			<h2>{chapter.title}</h2>
			<p>{chapter.body}</p>
		</motion.article>
	);
}

type RawFragmentProps = ProgressProps & (typeof rawFragments)[number];

function RawFragment({
	progress,
	text,
	x,
	y,
	rotate,
	delay,
}: RawFragmentProps) {
	const absorbed = useTransform(progress, [0.03 + delay, 0.34 + delay], [0, 1]);
	const opacity = useTransform(
		progress,
		[0, 0.22 + delay, 0.39 + delay, 1],
		[1, 1, 0, 0],
	);
	const transform = useTransform(absorbed, (value) => {
		const remaining = 1 - value;
		return `translate(-50%, -50%) translate3d(${x * remaining}px, ${y * remaining}px, 0) rotate(${rotate * remaining}deg) scale(${1 - value * 0.42})`;
	});

	return (
		<motion.span
			className="landing-circle-fragment"
			style={{ opacity, transform }}
		>
			{text}
		</motion.span>
	);
}

type ClearItemProps = ProgressProps & (typeof clearItems)[number];

function ClearItem({ progress, type, text, x, y, delay }: ClearItemProps) {
	const start = 0.5 + delay;
	const emitted = useTransform(progress, [start, 0.72 + delay], [0, 1]);
	const opacity = useTransform(progress, [start, start + 0.09, 1], [0, 1, 1]);
	const transform = useTransform(
		emitted,
		(value) =>
			`translate(-50%, -50%) translate3d(${x * value}px, ${y * value}px, 0) scale(${0.9 + value * 0.1})`,
	);

	return (
		<motion.div
			className="landing-circle-output"
			style={{ opacity, transform }}
		>
			<small>{type}</small>
			<span>{text}</span>
		</motion.div>
	);
}

function StaticCircle({ tone }: { tone: "raw" | "processing" | "clear" }) {
	return (
		<div className={`landing-circle-mobile-orb is-${tone}`} aria-hidden="true">
			<span />
		</div>
	);
}

export function CircleStory() {
	const storyRef = useRef<HTMLElement>(null);
	const reduced = useReducedMotion();
	const pointerX = useMotionValue(0);
	const pointerY = useMotionValue(0);
	const springX = useSpring(pointerX, { duration: 0.4, bounce: 0 });
	const springY = useSpring(pointerY, { duration: 0.4, bounce: 0 });
	const { scrollYProgress } = useScroll({
		target: storyRef,
		offset: ["start start", "end end"],
	});

	const orbScale = useTransform(
		scrollYProgress,
		[0, 0.2, 0.46, 0.7, 0.86, 1],
		[0.82, 0.94, 1.28, 1.38, 0.76, 0.66],
	);
	const orbTransform = useMotionTemplate`translate3d(${springX}px, ${springY}px, 0) scale(${orbScale})`;
	const heroTransform = useMotionTemplate`translate3d(${springX}px, ${springY}px, 0)`;
	const rawRingOpacity = useTransform(
		scrollYProgress,
		[0, 0.24, 0.38, 1],
		[1, 1, 0, 0],
	);
	const processRingOpacity = useTransform(
		scrollYProgress,
		[0, 0.2, 0.36, 0.65, 0.76, 1],
		[0, 0, 1, 1, 0, 0],
	);
	const clearRingOpacity = useTransform(
		scrollYProgress,
		[0, 0.62, 0.78, 1],
		[0, 0, 1, 1],
	);
	const progressTransform = useTransform(
		scrollYProgress,
		(value) => `scaleY(${value})`,
	);

	function moveTowardPointer(event: ReactPointerEvent<HTMLElement>) {
		if (reduced || event.pointerType !== "mouse") return;
		const rect = event.currentTarget.getBoundingClientRect();
		const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
		const relativeY =
			(event.clientY - rect.top) / Math.min(rect.height, window.innerHeight) -
			0.5;
		pointerX.set(Math.max(-14, Math.min(14, relativeX * 28)));
		pointerY.set(Math.max(-10, Math.min(10, relativeY * 20)));
	}

	function resetPointer() {
		pointerX.set(0);
		pointerY.set(0);
	}

	return (
		<div
			className="landing-circle-experience"
			onPointerMove={moveTowardPointer}
			onPointerLeave={resetPointer}
		>
			<section
				className="landing-circle-hero"
				aria-labelledby="circle-story-title"
			>
				<div className="landing-circle-hero-label landing-pixel-label">
					RAW IN / CLEAR OUT
				</div>
				<div className="landing-circle-hero-orb-shell" aria-hidden="true">
					<motion.div
						className="landing-circle-hero-orb"
						style={{ transform: heroTransform }}
					>
						<span className="landing-circle-ring is-raw" />
					</motion.div>
					<span className="landing-circle-hero-fragment is-one">
						idea a medias
					</span>
					<span className="landing-circle-hero-fragment is-two">jueves</span>
					<span className="landing-circle-hero-fragment is-three">
						no olvidar
					</span>
				</div>
				<div className="landing-circle-hero-copy">
					<h1 id="circle-story-title">
						Suelta cualquier cosa.
						<span>Unraw la pone en su sitio.</span>
					</h1>
				</div>
				<div className="landing-circle-hero-footer">
					<p>
						Ideas, tareas o pensamientos a medias. Tú los sueltas. Unraw hace el
						resto.
					</p>
					<div className="landing-circle-hero-actions">
						<Link href="#waitlist" className="landing-v2-primary-cta">
							Únete a la lista <span aria-hidden="true">↗</span>
						</Link>
						<Link href="#circle-story" className="landing-v2-text-link">
							Ver cómo se ordena <span aria-hidden="true">↓</span>
						</Link>
					</div>
				</div>
			</section>

			<section
				id="circle-story"
				ref={storyRef}
				className="landing-circle-story"
				aria-label="Cómo Unraw convierte una captura cruda en claridad"
			>
				<div className="sr-only">
					{chapters.map((chapter) => (
						<div key={chapter.index}>
							<h2>{chapter.title}</h2>
							<p>{chapter.body}</p>
						</div>
					))}
				</div>

				<div className="landing-circle-desktop" aria-hidden="true">
					<div className="landing-circle-stage">
						<div className="landing-circle-copy-stack">
							<StoryChapter
								progress={scrollYProgress}
								chapter={chapters[0]}
								times={[0, 0.04, 0.18, 0.28]}
							/>
							<StoryChapter
								progress={scrollYProgress}
								chapter={chapters[1]}
								times={[0.18, 0.29, 0.43, 0.53]}
							/>
							<StoryChapter
								progress={scrollYProgress}
								chapter={chapters[2]}
								times={[0.43, 0.55, 0.69, 0.79]}
							/>
							<StoryChapter
								progress={scrollYProgress}
								chapter={chapters[3]}
								times={[0.72, 0.83, 0.96, 1]}
								hold
							/>
						</div>

						<div className="landing-circle-visual">
							<motion.div
								className="landing-circle-orb"
								style={{ transform: orbTransform }}
							>
								<motion.span
									className="landing-circle-ring is-raw"
									style={{ opacity: rawRingOpacity }}
								/>
								<motion.span
									className="landing-circle-ring is-processing"
									style={{ opacity: processRingOpacity }}
								/>
								<motion.span
									className="landing-circle-ring is-clear"
									style={{ opacity: clearRingOpacity }}
								/>
								<span className="landing-circle-core-label landing-pixel-label">
									UNRAW
								</span>
							</motion.div>
							{rawFragments.map((fragment) => (
								<RawFragment
									key={fragment.text}
									progress={scrollYProgress}
									{...fragment}
								/>
							))}
							{clearItems.map((item) => (
								<ClearItem
									key={item.text}
									progress={scrollYProgress}
									{...item}
								/>
							))}
						</div>

						<div className="landing-circle-progress">
							<span>01</span>
							<div className="landing-circle-progress-track">
								<motion.div style={{ transform: progressTransform }} />
							</div>
							<span>04</span>
						</div>
					</div>
				</div>

				<div className="landing-circle-mobile">
					{chapters.map((chapter, index) => {
						const tone =
							index === 0 ? "raw" : index === 1 ? "processing" : "clear";
						return (
							<motion.article
								className="landing-circle-mobile-scene"
								key={chapter.index}
								initial={
									reduced
										? false
										: { opacity: 0, transform: "translateY(28px)" }
								}
								whileInView={{ opacity: 1, transform: "translateY(0px)" }}
								viewport={{ once: true, margin: "0px 0px -64px 0px" }}
								transition={{ duration: 0.6, ease: STORY_EASE }}
							>
								<span className="landing-pixel-label">
									{chapter.index} / 04
								</span>
								<StaticCircle tone={tone} />
								<h2>{chapter.title}</h2>
								<p>{chapter.body}</p>
								{index === 2 && (
									<div className="landing-circle-mobile-results">
										{clearItems.map((item) => (
											<div key={item.text}>
												<small>{item.type}</small>
												<span>{item.text}</span>
											</div>
										))}
									</div>
								)}
							</motion.article>
						);
					})}
				</div>
			</section>
		</div>
	);
}
