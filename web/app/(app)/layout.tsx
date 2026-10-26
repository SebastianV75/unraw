"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import BookSaved from "reicon-react/icons/BookSaved";
import Grid2 from "reicon-react/icons/Grid2";
import Inbox from "reicon-react/icons/Inbox";
import Search from "reicon-react/icons/Search";
import DocAdd from "reicon-react/icons/DocAdd";
import Layer from "reicon-react/icons/Layer";
import Logout6 from "reicon-react/icons/Logout6";
import Moon3 from "reicon-react/icons/Moon3";
import More2 from "reicon-react/icons/More2";
import Settings2 from "reicon-react/icons/Settings2";
import Sun4 from "reicon-react/icons/Sun4";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import { CommandPalette } from "@/components/navigation/CommandPalette";
import { GlobalCaptureComposer } from "@/components/capture/GlobalCaptureComposer";
import { FloatingNavigation } from "@/components/rareui/FloatingNavigation/FloatingNavigation";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { label: "Captura", href: "/capture", icon: DocAdd },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Hoy", href: "/overview", icon: Grid2 },
  { label: "Buscar", href: "/search", icon: Search },
  { label: "Áreas", href: "/areas", icon: Layer },
  { label: "Conocimiento", href: "/second-brain", icon: BookSaved },
  { label: "Configuración", href: "/settings", icon: Settings2 },
] as const;

const mobileNavigation = [
  { label: "Inicio", href: "/overview", icon: Grid2 },
  { label: "Captura", href: "/capture", icon: DocAdd },
  { label: "Buscar", href: "/search", icon: Search },
] as const;

const moreNavigation = [
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Áreas", href: "/areas", icon: Layer },
  { label: "Conocimiento", href: "/second-brain", icon: BookSaved },
  { label: "Configuración", href: "/settings", icon: Settings2 },
] as const;

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"unraw" | "unraw-dark">("unraw");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const isCapture = pathname === "/capture";
  const isMoreActive = moreNavigation.some(({ href }) => isActive(href));

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "unraw" || currentTheme === "unraw-dark") {
      setTheme(currentTheme);
    }
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Native dialogs own keyboard input while open, including Escape and Tab.
      if (document.querySelector("dialog[open]")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpen(false);
        moreButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        moreMenuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !moreMenuRef.current?.contains(target) &&
        !moreButtonRef.current?.contains(target)
      ) {
        setMoreOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    const firstLink = moreMenuRef.current?.querySelector<HTMLAnchorElement>(
      "a",
    );
    firstLink?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [moreOpen]);

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
    return href === "/areas" || href === "/second-brain"
      ? pathname.startsWith(href)
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
      <a className="app-skip-link" href="#main-content">
        Saltar al contenido principal
      </a>
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
      <div className="app-shell-global-capture">
        <GlobalCaptureComposer />
      </div>
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
        </div>
      </header>
      <nav className="app-shell-mobile-nav" aria-label="Navegación móvil">
        <FloatingNavigation
          items={mobileNavigation}
          isActive={isActive}
          more={(
            <>

          <button
            ref={moreButtonRef}
            className={`app-shell-mobile-nav-item app-shell-mobile-more-trigger ${
              isMoreActive ? "is-active" : ""
            }`}
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            aria-current={isMoreActive ? "page" : undefined}
            aria-label="Más opciones de navegación"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <More2
              size={20}
              color="currentColor"
              weight="Outline"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span>Más</span>
          </button>
          {moreOpen && (
              <div
                id="mobile-more-menu"
                ref={moreMenuRef}
                className="app-shell-mobile-more-menu"
                role="group"
                aria-label="Más zonas"
                aria-hidden={!moreOpen}
                inert={!moreOpen}
              >
                {moreNavigation.map(({ label, href, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      className={`app-shell-mobile-more-item ${
                        active ? "is-active" : ""
                      }`}
                      href={href}
                      key={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon
                        size={18}
                        color="currentColor"
                        weight="Outline"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                      <span>{label}</span>
                    </Link>
                  );
                })}
                <button
                  className="app-shell-mobile-more-item app-shell-mobile-more-signout"
                  type="button"
                  onClick={signOut}
                  disabled={loading}
                  aria-busy={loading}
                  aria-label="Cerrar sesión"
                >
                  <Logout6
                    size={18}
                    color="currentColor"
                    weight="Outline"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                  <span>{loading ? "Cerrando sesión…" : "Cerrar sesión"}</span>
                </button>
              </div>
            )}
            </>
          )}
        />
      </nav>
      <main id="main-content" className="app-shell-main">{children}</main>
    </div>
  );
}
