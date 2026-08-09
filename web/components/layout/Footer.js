import Logo from "@/components/Logo"

export default function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-base-content/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold text-base-content">
          <Logo className="size-6" />
          Unraw
        </div>
        <span>Un sistema simple para pensar y avanzar.</span>
      </div>
    </footer>
  )
}
