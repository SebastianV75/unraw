"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const navigation = [
  ["Overview", "/overview"],
  ["Capture", "/capture"],
  ["Areas", "/areas"],
  ["Second Brain", "/second-brain"],
  ["Settings", "/settings"],
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    await createClient().auth.signOut()
    router.replace("/login")
  }

  return (
    <div className="min-h-screen bg-base-200 md:flex">
      <aside className="border-b border-base-300 bg-base-100 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-8 px-3 text-xl font-bold">Unraw</div>
        <nav className="flex gap-2 overflow-x-auto md:block md:space-y-2">
          {navigation.map(([label, href]) => <Link className={`btn justify-start whitespace-nowrap md:w-full ${pathname === href || pathname.startsWith(`${href}/`) ? "btn-primary" : "btn-ghost"}`} href={href} key={href}>{label}</Link>)}
        </nav>
        <button className="btn btn-ghost mt-6 w-full justify-start" type="button" onClick={signOut} disabled={loading}>{loading ? "Signing out..." : "Sign out"}</button>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}
