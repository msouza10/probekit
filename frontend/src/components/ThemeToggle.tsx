import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"
const storageKey = "probekit-theme"

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  )

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!media) return
    const followSystem = () => {
      try {
        if (localStorage.getItem(storageKey)) return
      } catch {
        /* Storage may be disabled. */
      }
      const next = media.matches ? "dark" : "light"
      applyTheme(next)
      setTheme(next)
    }
    media.addEventListener("change", followSystem)
    return () => media.removeEventListener("change", followSystem)
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    applyTheme(next)
    setTheme(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      /* Theme still works for this visit. */
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Modo escuro"
      title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      onClick={toggle}
      className="theme-toggle relative flex h-9 w-16 shrink-0 items-center justify-between rounded-full border border-border bg-muted px-2"
    >
      <span
        aria-hidden="true"
        className={`theme-toggle-thumb absolute top-1 h-7 w-7 rounded-full border border-border bg-card shadow-sm ${theme === "dark" ? "left-[31px]" : "left-1"}`}
      />
      <Sun
        aria-hidden="true"
        className={`relative h-4 w-4 ${theme === "light" ? "text-blue-cornflower" : "text-fog"}`}
      />
      <Moon
        aria-hidden="true"
        className={`relative h-4 w-4 ${theme === "dark" ? "text-blue-cornflower" : "text-fog"}`}
      />
    </button>
  )
}
