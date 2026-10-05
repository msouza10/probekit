import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react"

/** Progressive enhancement: content stays visible without observer support. */
export function Reveal({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (
      !ref.current ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.08 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "reveal-visible" : ""}`}
      {...props}
    />
  )
}
