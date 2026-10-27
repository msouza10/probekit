"use client"

import { logos } from "@/components/icons/techLogos"

export default function LogoCloudBlock() {
  return (
    <section
      aria-label="Tecnologias do Probekit"
      className="flex w-full flex-col items-center bg-background text-foreground"
    >
      <style>{`
        @keyframes logo-cloud-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .logo-cloud-track {
          animation: logo-cloud-marquee 32s linear infinite;
        }
        .logo-cloud-mask:hover .logo-cloud-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-cloud-track {
            animation: none;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl text-center">
        <p className="font-sans text-caption font-medium tracking-[0.12em] text-muted-foreground uppercase">
          O que roda por baixo
        </p>

        <div className="logo-cloud-mask relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] motion-reduce:[mask-image:none]">
          <div className="logo-cloud-track flex w-max items-center motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-4">
            {[...logos, ...logos].map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className={`flex shrink-0 items-center gap-2.5 px-8 text-muted-foreground transition-colors duration-200 hover:text-foreground ${index >= logos.length ? "motion-reduce:hidden" : ""}`}
                aria-hidden={index >= logos.length ? "true" : undefined}
              >
                <svg
                  viewBox={logo.viewBox}
                  fill="currentColor"
                  className={`${logo.className} w-auto shrink-0`}
                  aria-hidden="true"
                >
                  {logo.shapes}
                </svg>
                <span className="text-lg font-medium tracking-tight whitespace-nowrap">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
