import Link from "next/link"
import Footer from "@/components/layout/Footer"
import Logo from "@/components/Logo"

const appLinks = [
  ["Overview", "/overview"],
  ["Captura", "/capture"],
  ["Áreas", "/areas"],
  ["Second Brain", "/second-brain"],
  ["Configuración", "/settings"],
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-base-300 bg-base-100">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-3 text-lg font-bold tracking-tight">
            <Logo className="size-8" />
            Unraw
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm">Iniciar sesión</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Crear cuenta</Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="hero-grid border-b border-base-300 px-5 py-24 md:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-primary">Unraw</p>
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl">Ordena lo que tienes en mente.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-base-content/70 md:text-xl">
              Unraw convierte tus ideas, tareas y proyectos en un sistema claro para pensar y avanzar con intención.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login" className="btn btn-primary">Iniciar sesión</Link>
              <Link href="/register" className="btn btn-outline">Crear cuenta</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tu espacio de trabajo</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Menos ruido. Más claridad.</h2>
            <p className="mt-4 text-base leading-7 text-base-content/70">
              Captura lo importante, organiza tus áreas y proyectos, y revisa todo desde un solo lugar.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {appLinks.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-box border border-base-300 bg-base-100 p-5 transition hover:-translate-y-0.5 hover:border-primary">
                <span className="font-semibold">{label}</span>
                <span className="mt-2 block text-sm text-base-content/60">Abrir sección</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
