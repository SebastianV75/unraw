"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ArrowRight4 from "reicon-react/icons/ArrowRight4";
import BookSaved from "reicon-react/icons/BookSaved";
import Bulb from "reicon-react/icons/Bulb";
import Check3 from "reicon-react/icons/Check3";
import ListCheck from "reicon-react/icons/ListCheck";
import Loader from "reicon-react/icons/Loader";

const sampleNote =
	"llamar al contador mañana, revisar el contrato antes del jueves y no olvidar la idea de una newsletter para clientes";
const DEMO_EASE = [0.23, 1, 0.32, 1] as const;

type DemoPhase = "raw" | "processing" | "clear";

export function CapturePreview() {
	const [phase, setPhase] = useState<DemoPhase>("raw");
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reduced = useReducedMotion();

	useEffect(() => {
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);

	function organize() {
		if (phase !== "raw") return;
		setPhase("processing");
		timer.current = setTimeout(() => setPhase("clear"), reduced ? 0 : 560);
	}

	return (
		<div
			className="landing-demo"
			aria-label="Demostración de Unraw"
			aria-busy={phase === "processing"}
		>
			<div className="landing-demo-topbar">
				<span className="landing-pixel-label">CAPTURE / 001</span>
				<span className="landing-demo-status">
					<span className="landing-demo-status-dot" aria-hidden="true" />
					{phase === "processing"
						? "Procesando"
						: phase === "clear"
							? "Lista"
							: "Sin ordenar"}
				</span>
			</div>
			<div className="landing-demo-body">
				<AnimatePresence mode="wait" initial={false}>
					{phase === "raw" && (
						<motion.div
							key="raw"
							className="landing-demo-state"
							initial={{ opacity: 0, transform: "translateY(6px)" }}
							animate={{ opacity: 1, transform: "translateY(0px)" }}
							exit={{
								opacity: 0,
								filter: "blur(2px)",
								transform: "translateY(-4px)",
							}}
							transition={{ duration: 0.2, ease: DEMO_EASE }}
						>
							<span className="landing-pixel-label landing-demo-label-raw">
								RAW NOTE
							</span>
							<p className="landing-demo-raw-text">{sampleNote}</p>
							<div className="landing-demo-footer">
								<span>Escribe como te salga.</span>
								<button type="button" onClick={organize}>
									Ordenar esta nota{" "}
									<ArrowRight4
										size={14}
										color="currentColor"
										weight="Outline"
									/>
								</button>
							</div>
						</motion.div>
					)}
					{phase === "processing" && (
						<motion.div
							key="processing"
							className="landing-demo-processing"
							initial={{ opacity: 0, transform: "translateY(6px)" }}
							animate={{ opacity: 1, transform: "translateY(0px)" }}
							exit={{ opacity: 0, transform: "translateY(-4px)" }}
							transition={{ duration: 0.2, ease: DEMO_EASE }}
						>
							<Loader
								size={24}
								color="currentColor"
								weight="Outline"
								className="landing-demo-loader"
							/>
							<span className="landing-pixel-label">SORTING THE RAW</span>
							<p>Encontrando qué necesita acción y qué merece quedarse.</p>
						</motion.div>
					)}
					{phase === "clear" && (
						<motion.div
							key="clear"
							className="landing-demo-state"
							initial={{ opacity: 0, transform: "translateY(6px)" }}
							animate={{ opacity: 1, transform: "translateY(0px)" }}
							transition={{ duration: 0.25, ease: DEMO_EASE }}
						>
							<div className="landing-demo-result-heading">
								<span className="landing-pixel-label">CLEAR OUTPUT</span>
								<button type="button" onClick={() => setPhase("raw")}>
									Otra nota
								</button>
							</div>
							<div className="landing-demo-items">
								<div className="landing-demo-item">
									<ListCheck size={17} color="currentColor" weight="Outline" />
									<span>Llamar al contador mañana</span>
									<small>Finanzas</small>
								</div>
								<div className="landing-demo-item">
									<Check3 size={17} color="currentColor" weight="Outline" />
									<span>Revisar el contrato antes del jueves</span>
									<small>Trabajo</small>
								</div>
								<div className="landing-demo-item">
									<Bulb size={17} color="currentColor" weight="Outline" />
									<span>Newsletter mensual para clientes</span>
									<small>Idea</small>
								</div>
								<div className="landing-demo-item">
									<BookSaved size={17} color="currentColor" weight="Outline" />
									<span>La nota queda guardada en tu sistema</span>
									<small>Nota</small>
								</div>
							</div>
							<p className="landing-demo-reassurance">
								Nota guardada. Nosotros nos encargamos.
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
