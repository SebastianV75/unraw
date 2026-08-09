import Link from "next/link"
import { signOut } from "@/lib/auth/actions"

// Menú de usuario con avatar de Google y botón de cerrar sesión.
// Server Component: el logout es un Server Action (form action).
export default function UserMenu({ user }) {
  const meta = user.user_metadata || {}
  const name = meta.full_name || meta.name || user.email
  const avatar = meta.avatar_url || meta.picture
  const initial = (name || "?").charAt(0).toUpperCase()

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            referrerPolicy="no-referrer"
            className="size-7 rounded-full"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content">
            {initial}
          </span>
        )}
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
      </div>

      <ul
        tabIndex={0}
        className="dropdown-content menu z-50 mt-2 w-52 rounded-box border border-base-200 bg-base-100 p-2 shadow-lg"
      >
        <li className="menu-title truncate">{user.email}</li>
        <li>
          <Link href="/overview">Overview</Link>
        </li>
        <li>
          <form action={signOut}>
            <button type="submit" className="w-full text-left text-error">
              Cerrar sesión
            </button>
          </form>
        </li>
      </ul>
    </div>
  )
}
