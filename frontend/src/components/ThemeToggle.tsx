import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
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
    const swap = () => {
      applyTheme(next)
      setTheme(next)
    }
    // A API tira um retrato da tela antes e outro depois do callback; o CSS
    // anima entre os dois (index.css, "Troca de tema"). Sem ela, troca direta.
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(() => flushSync(swap))
    } else {
      swap()
    }
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
      className="relative flex h-9 w-16 shrink-0 items-center justify-between rounded-full border border-border bg-muted px-2"
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 h-7 w-7 rounded-full border border-input bg-background motion-safe:transition-[left] motion-safe:duration-150 ${theme === "dark" ? "left-[31px]" : "left-1"}`}
      />
      <Sun
        aria-hidden="true"
        className={`relative h-4 w-4 ${theme === "light" ? "text-highlight" : "text-muted-foreground"}`}
      />
      <Moon
        aria-hidden="true"
        className={`relative h-4 w-4 ${theme === "dark" ? "text-highlight" : "text-muted-foreground"}`}
      />
    </button>
  )
}
