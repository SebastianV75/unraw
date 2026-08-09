import Link from "next/link";
import Logo from "@/components/Logo";

export default function Navbar() {
	return (
		<header className="sticky top-0 z-40 w-full border-b border-base-200 bg-base-100/80 backdrop-blur">
			<nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
				<div className="flex items-center gap-2">
					<Link
						href="/"
						className="flex items-center gap-2 text-lg font-bold tracking-tight"
					>
						<Logo variant="wordmark" className="h-6 w-auto" alt="Unraw" />
					</Link>
				</div>

				<div className="flex items-center gap-2">
					<Link href="/login" className="btn btn-sm btn-ghost">
						Iniciar sesión
					</Link>
					<Link href="/register" className="btn btn-sm btn-primary">
						Crear cuenta
					</Link>
				</div>
			</nav>
		</header>
	);
}
