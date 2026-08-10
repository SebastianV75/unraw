"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import BookSaved from "reicon-react/icons/BookSaved";
import ChevronRight from "reicon-react/icons/ChevronRight";
import Grid2 from "reicon-react/icons/Grid2";
import Inbox from "reicon-react/icons/Inbox";
import DocAdd from "reicon-react/icons/DocAdd";
import Layer from "reicon-react/icons/Layer";
import Logout6 from "reicon-react/icons/Logout6";
import Menu4 from "reicon-react/icons/Menu4";
import Moon3 from "reicon-react/icons/Moon3";
import Settings2 from "reicon-react/icons/Settings2";
import Sun4 from "reicon-react/icons/Sun4";
import X from "reicon-react/icons/X";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { CommandPalette } from "@/components/navigation/CommandPalette";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { label: "Captura", href: "/capture", icon: DocAdd },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Hoy", href: "/overview", icon: Grid2 },
  { label: "Áreas", href: "/areas", icon: Layer },
  { label: "Conocimiento", href: "/second-brain", icon: BookSaved },
  { label: "Configuración", href: "/settings", icon: Settings2 },
] as const;

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"unraw" | "unraw-dark">("unraw");

  const isCapture = pathname === "/capture";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "unraw" || currentTheme === "unraw-dark") {
      setTheme(currentTheme);
    }
  }, []);

  async function signOut() {
    setLoading(true);
    await createClient().auth.signOut();
    router.replace("/login");
  }

  function toggleTheme() {
    const nextTheme = theme === "unraw" ? "unraw-dark" : "unraw";
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  }

  function isActive(href: string) {
    return href === "/areas"
      ? pathname.startsWith("/areas")
      : pathname === href;
  }

  function renderNavigation() {
    return navigation.map(({ label, href, icon: Icon }) => {
      const active = isActive(href);
      return (
        <Link
          className={`app-shell-nav-item ${active ? "is-active" : ""}`}
          href={href}
          key={href}
          aria-current={active ? "page" : undefined}
          aria-label={label}
          title={label}
          onClick={() => setMobileNavOpen(false)}
        >
          <Icon
            size={16}
            color="currentColor"
            weight="Outline"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <span>{label}</span>
        </Link>
      );
    });
  }

  const ThemeIcon = theme === "unraw" ? Moon3 : Sun4;

  return (
    <div className={`app-shell ${isCapture ? "is-capture" : ""}`}>
      <aside className="app-shell-sidebar" aria-label="Navegación principal">
        <Link
          className="app-shell-brand"
          href="/capture"
          aria-label="Abrir captura de Unraw"
        >
          <Logo variant="appMark" className="app-shell-brand-mark" />
          <span>Unraw</span>
        </Link>
        <nav className="app-shell-nav">{renderNavigation()}</nav>
        <div className="app-shell-sidebar-footer">
          <div className="app-shell-footer-note">
            <span className="app-shell-footer-note-key">⌘K</span>
            <span>Buscar en Unraw</span>
          </div>
          <div className="app-shell-utility-row">
            <button
              className="app-shell-utility"
              type="button"
              onClick={toggleTheme}
              aria-label={`Cambiar al tema ${theme === "unraw" ? "oscuro" : "claro"}`}
              title={`Cambiar al tema ${theme === "unraw" ? "oscuro" : "claro"}`}
            >
              <ThemeIcon
                size={16}
                color="currentColor"
                weight="Outline"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <span>{theme === "unraw" ? "Tema oscuro" : "Tema claro"}</span>
            </button>
            <button
              className="app-shell-utility"
              type="button"
              onClick={signOut}
              disabled={loading}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <Logout6
                size={16}
                color="currentColor"
                weight="Outline"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <span>{loading ? "Cerrando sesión…" : "Cerrar sesión"}</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="app-shell-command-palette">
        <CommandPalette />
      </div>
      <header className="app-shell-mobile-header">
        <Link
          className="app-shell-brand"
          href="/capture"
          aria-label="Abrir captura de Unraw"
        >
          <Logo variant="appMark" className="app-shell-brand-mark" />
          <span>Unraw</span>
        </Link>
        <div className="app-shell-mobile-actions">
          <button
            className="app-shell-icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label={`Cambiar al tema ${theme === "unraw" ? "oscuro" : "claro"}`}
            title={`Cambiar al tema ${theme === "unraw" ? "oscuro" : "claro"}`}
          >
            <ThemeIcon
              size={17}
              color="currentColor"
              weight="Outline"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </button>
          <button
            className="app-shell-icon-button"
            type="button"
            onClick={() => setMobileNavOpen((current) => !current)}
            aria-label={
              mobileNavOpen ? "Cerrar navegación" : "Abrir navegación"
            }
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <X
                size={19}
                color="currentColor"
                weight="Outline"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            ) : (
              <Menu4
                size={19}
                color="currentColor"
                weight="Outline"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </header>
      {mobileNavOpen && (
        <div className="app-shell-mobile-menu">
          <nav className="app-shell-nav" aria-label="Navegación móvil">
            {renderNavigation()}
          </nav>
          <Link
            className="app-shell-capture"
            href="/capture"
            onClick={() => setMobileNavOpen(false)}
          >
            <Inbox
              size={16}
              color="currentColor"
              weight="Outline"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span>Nueva captura</span>
            <ChevronRight
              size={16}
              color="currentColor"
              weight="Outline"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </Link>
          <button
            className="app-shell-mobile-signout"
            type="button"
            onClick={signOut}
            disabled={loading}
          >
            <Logout6
              size={16}
              color="currentColor"
              weight="Outline"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span>{loading ? "Cerrando sesión…" : "Cerrar sesión"}</span>
          </button>
        </div>
      )}
      <main className="app-shell-main">{children}</main>
    </div>
  );
}
