// O LinkedIn não está mais nos catálogos de ícones (lucide, simple-icons);
// este é um desenho simples do "in" num quadrado, em cor única.
export function LinkedinIcon({
  className = "h-4 w-4",
}: {
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <rect x="6.5" y="10.5" width="3" height="7" fill="currentColor" />
      <path
        d="M11.5 10.5h2.8v1c.5-.8 1.4-1.2 2.4-1.2 2 0 2.8 1.3 2.8 3.2v4h-3v-3.5c0-.8-.3-1.3-1-1.3s-1 .5-1 1.3v3.5h-3z"
        fill="currentColor"
      />
    </svg>
  )
}
