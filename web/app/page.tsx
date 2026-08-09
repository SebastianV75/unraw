import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Logo from "@/components/Logo";
import { Accordion } from "@/components/interior/accordion";
import { CircleStory } from "@/components/landing/CircleStory";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import config from "@/config";

const { hero, faq, waitlist } = config.landing;

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
				<CircleStory />

				<LandingReveal delay={0.04}>
					<section
						id="system"
						className="landing-v2-ownership landing-circle-system"
					>
						<div className="landing-v2-ownership-copy">
							<span className="landing-pixel-label landing-v2-section-number">
								DESPUÉS / TU SISTEMA
							</span>
							<h2>Lo ordena. No te encierra.</h2>
							<p>
								Unraw entiende lo que capturas y lo devuelve listo al sistema
								que ya es tuyo.
							</p>
							<Link href="#circle-story" className="landing-v2-text-link">
								Volver a la transformación <span aria-hidden="true">↑</span>
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

				<LandingReveal delay={0.06}>
					<section id="faq" className="landing-v2-faq landing-circle-faq">
						<div className="landing-v2-section-intro">
							<div>
								<span className="landing-pixel-label landing-v2-section-number">
									ANTES DE SOLTAR
								</span>
								<h2>Lo que quieres saber.</h2>
							</div>
						</div>
						<div className="landing-v2-faq-list">
							<Accordion
								items={faq.items.map((item, index) => ({
									id: `faq-${index + 1}`,
									title: item.q,
									content: item.a,
								}))}
								className="landing-v2-faq-accordion"
							/>
						</div>
					</section>
				</LandingReveal>

				<LandingReveal delay={0.08}>
					<section
						id="waitlist"
						className="landing-v2-waitlist landing-circle-final-waitlist"
					>
						<div className="landing-v2-waitlist-copy">
							<span className="landing-pixel-label landing-v2-section-number">
								ACCESO ANTICIPADO
							</span>
							<h2>Deja que tu cabeza vuelva a ser un lugar.</h2>
							<p>{waitlist.subtitle}</p>
						</div>
						<WaitlistForm
							buttonLabel={waitlist.buttonLabel}
							placeholder={waitlist.placeholder}
							successMessage={waitlist.successMessage}
						/>
					</section>
				</LandingReveal>
			</main>

			<Footer />
		</div>
	);
}
