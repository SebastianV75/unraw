// Un símbolo simple para la marca Unraw.
export default function Logo({ className = "size-7" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-primary text-primary-content ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[62%]">
        <path
          d="M3.5 12 H7 L10.5 18 L15.5 6 H20.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
