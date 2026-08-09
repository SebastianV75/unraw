import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Logo from "@/components/Logo";
import { CapturePreview } from "@/components/landing/CapturePreview";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import config from "@/config";

const { hero, features, faq, waitlist } = config.landing;
export default function HomePage() {
	return (
		<div className="landing-page landing-v2">
			<header className="landing-v2-nav">
				<nav className="landing-v2-nav-inner" aria-label="Navegación principal">
					<Link
						href="/"
						className="landing-v2-brand"
						aria-label={`${config.app.name}, inicio`}
					>
						<Logo
							variant="wordmark"
							className="h-6 w-auto"
							alt={config.app.name}
						/>
					</Link>
					<div className="landing-v2-nav-note">
						<span className="landing-pixel-label">TU INBOX, SIN CULPA</span>
					</div>
					<div className="landing-v2-nav-actions">
						<Link href="/login" className="landing-v2-login">
							Entrar
						</Link>
						<Link href={hero.cta.href} className="landing-v2-nav-cta">
							{hero.cta.label}
						</Link>
					</div>
				</nav>
			</header>

			<main>
				<section className="landing-v2-hero">
					<div className="landing-v2-hero-copy">
						<div className="landing-v2-kicker">
							<span className="landing-pixel-label">
								CAPTURE / PROCESS / MOVE
							</span>
							<span className="landing-v2-kicker-dot" aria-hidden="true" />
						</div>
						<h1>{hero.title}</h1>
						<p className="landing-v2-hero-lead">{hero.subtitle}</p>
						<div className="landing-v2-hero-actions">
							<Link href={hero.cta.href} className="landing-v2-primary-cta">
								{hero.cta.label}
								<span aria-hidden="true">↗</span>
							</Link>
							<Link href="#how-it-works" className="landing-v2-text-link">
								Ver la transformación
							</Link>
						</div>
						<p className="landing-v2-hero-footnote">
							Acceso anticipado. Sin spam. Sin otro sistema que mantener.
						</p>
					</div>
					<div className="landing-v2-hero-demo">
						<CapturePreview />
					</div>
				</section>

				<LandingReveal delay={0.04}>
					<section
						className="landing-v2-manifesto"
						aria-label="El problema que resuelve Unraw"
					>
						<div className="landing-v2-manifesto-topline">
							<span className="landing-pixel-label">THE MISSING BRIDGE</span>
							<span className="landing-pixel-label">01 / 04</span>
						</div>
						<h2>
							No te falta disciplina.
							<br />
							<span>Te falta el puente.</span>
						</h2>
						<div className="landing-v2-manifesto-bottom">
							<p>
								Capturar es fácil. Procesar cada nota cuando ya estás cansada es
								el trabajo que Unraw hace por ti.
							</p>
							<span className="landing-pixel-label">RAW IN / CLEAR OUT</span>
						</div>
					</section>
				</LandingReveal>

				<LandingReveal delay={0.08}>
					<section id="how-it-works" className="landing-v2-flow">
						<div className="landing-v2-section-intro">
							<h2>Deja de ordenar antes de empezar.</h2>
							<p>
								Tu única tarea es sacar la idea de la cabeza. Lo demás puede
								esperar.
							</p>
						</div>
						<div className="landing-v2-flow-list">
							{features.items.map((item, index) => (
								<div className="landing-v2-flow-row" key={item.title}>
									<span className="landing-v2-flow-index">0{index + 1}</span>
									<h3>{item.title}</h3>
									<p>{item.body}</p>
									<span className="landing-v2-flow-arrow" aria-hidden="true">
										↗
									</span>
								</div>
							))}
						</div>
					</section>
				</LandingReveal>

				<LandingReveal delay={0.12}>
					<section id="system" className="landing-v2-ownership">
						<div className="landing-v2-ownership-copy">
							<h2>Tu sistema sigue siendo tuyo.</h2>
							<p>
								Unraw no te pide aprender una metodología. Entiende lo que
								capturas y lo deja listo en el lugar correcto.
							</p>
							<Link href={hero.cta.href} className="landing-v2-text-link">
								Quiero verlo en acción <span aria-hidden="true">↗</span>
							</Link>
						</div>
						<div
							className="landing-v2-system-sheet"
							aria-label="Las partes de tu sistema personal"
						>
							<div className="landing-v2-system-sheet-top">
								<span className="landing-pixel-label">
									UNRAW / READY TO USE
								</span>
								<span className="landing-pixel-label">YOUR SYSTEM</span>
							</div>
							<div className="landing-v2-system-grid">
								<div className="landing-v2-system-cell landing-v2-system-cell-dark">
									<span>Tareas</span>
									<small>lo que toca hacer</small>
								</div>
								<div className="landing-v2-system-cell">
									<span>Ideas</span>
									<small>lo que merece volver</small>
								</div>
								<div className="landing-v2-system-cell">
									<span>Notas</span>
									<small>lo que quieres conservar</small>
								</div>
								<div className="landing-v2-system-cell landing-v2-system-cell-accent">
									<span>Áreas</span>
									<small>el contexto que conecta todo</small>
								</div>
							</div>
						</div>
					</section>
				</LandingReveal>

				<section id="waitlist" className="landing-v2-waitlist">
					<div className="landing-v2-waitlist-copy">
						<span className="landing-pixel-label">ACCESO ANTICIPADO</span>
						<h2>{waitlist.title}</h2>
						<p>{waitlist.subtitle}</p>
					</div>
					<WaitlistForm
						buttonLabel={waitlist.buttonLabel}
						placeholder={waitlist.placeholder}
						successMessage={waitlist.successMessage}
					/>
				</section>

				<section id="faq" className="landing-v2-faq">
					<div className="landing-v2-section-intro">
						<h2>Lo que seguramente quieres saber.</h2>
					</div>
					<div className="landing-v2-faq-list">
						{faq.items.map((item) => (
							<details className="landing-v2-faq-item" key={item.q}>
								<summary>{item.q}</summary>
								<p>{item.a}</p>
							</details>
						))}
					</div>
				</section>

				<section className="landing-v2-closing">
					<h2>Deja que tu cabeza vuelva a ser un lugar.</h2>
					<Link href={hero.cta.href} className="landing-v2-primary-cta">
						{hero.cta.label}
						<span aria-hidden="true">↗</span>
					</Link>
				</section>
			</main>

			<Footer />
		</div>
	);
}
