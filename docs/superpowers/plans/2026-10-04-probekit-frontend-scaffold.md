# Probekit Frontend Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Probekit frontend scaffold: a buildable, navigable React site with a themed, animated component foundation (shadcn/ui primitives + Motion) and a home page listing the ping/DNS-lookup tools, ready for their dedicated feature specs to plug into.

**Architecture:** A Vite + React + TypeScript SPA. Visual tokens and the shadcn/ui theme mapping come straight from `frontend/design.md`. The shadcn/ui CLI generates ready-made Radix-based primitives into `src/components/ui/`, and feature components (`ToolCard`, `Header`) compose from those primitives — favoring pre-built, battle-tested components over hand-rolled ones, per the project's "bastante componentes prontos" direction. Motion drives micro-interactions on `ui/` primitives and route transitions via `AnimatePresence`, globally respecting `prefers-reduced-motion` through `MotionConfig`.

**Tech Stack:** React + Vite + TypeScript; Tailwind CSS v4 (CSS-first `@theme`); shadcn/ui (Radix UI underneath) via its CLI; Motion (`motion` package) for animation; `react-router-dom` for routing; Vitest + Testing Library + jsdom for tests; ESLint + Prettier for lint/format.

**Spec:** `docs/superpowers/specs/2026-10-01-probekit-frontend-scaffold-design.md` (visual tokens and the shadcn theme mapping referenced throughout come from `frontend/design.md`, which that spec points to).

## Global Constraints

- Project lives in `frontend/`; React + Vite + TypeScript from the start.
- Styling via Tailwind CSS (CSS-first, v4); tokens centralized from `frontend/design.md`.
- UI components come from the shadcn/ui CLI (Radix UI underneath) into `src/components/ui/` — shadcn itself never becomes a runtime package dependency; prefer generating a ready-made primitive over hand-building one.
- Animation via the `motion` package: micro-interactions on `ui/` primitives, route transitions via `AnimatePresence`; `prefers-reduced-motion` must be respected globally.
- Out of scope for this plan (per spec): ping/DNS tool logic, backend API calls, automated deploy, accounts/auth/themes/i18n.
- Probekit is dark-only — no theme toggle in this plan.
- The `Signal Red` color exception exists only for error states — not used in this plan (placeholder pages have no error state yet).
- `npm run build` must produce a working static `dist/` — re-verified at the end of every task, not just the last one.

## Review Focus

1. Adding a new tool to the static list must not require touching `Home.tsx` or the layout — the acceptance test must iterate the real `tools` array, not a hardcoded count, or this regression passes unnoticed. (Task 7)
2. Tool cards must stay keyboard-focusable/navigable as real links (`<a href>`), not `<div onClick>` — easy to break when composing `Button asChild` with Motion. (Task 7)
3. People with `prefers-reduced-motion` enabled must not receive hover/transition animations — handled globally via `MotionConfig`, not a per-component opt-out that's easy to forget on a new primitive. (Task 5)
4. Navigating between routes in quick succession must not leave two pages mounted at once (a stuck `AnimatePresence` exit). (Task 5)
5. Every new dependency (Tailwind, shadcn, Motion, Router) can silently break the build — so every task, not only the last, ends by running `npm run test` and `npm run build`. (all tasks)

---

### Task 1: Vite + React + TypeScript scaffold with path alias and test harness

**Files:**
- Create (via scaffold command): `frontend/package.json`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/vite-env.d.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`
- Modify: `frontend/vite.config.ts`, `frontend/tsconfig.app.json`, `frontend/src/App.tsx`
- Create: `frontend/src/setupTests.ts`, `frontend/src/App.test.tsx`
- Delete: `frontend/.gitignore` (duplicates the root `.gitignore`), `frontend/src/App.css`, `frontend/src/assets/react.svg`, `frontend/public/vite.svg`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a buildable `frontend/` project; `@/*` alias resolving to `frontend/src/*`; `npm run test` (Vitest + jsdom + Testing Library) and `npm run build` both green; `App` default export (`frontend/src/App.tsx`) rendering an `<h1>Probekit</h1>`.

- [ ] **Step 1: Scaffold the project**

Run from the repo root:

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Verify the default scaffold builds**

Run: `npm run build`
Expected: succeeds, creates `frontend/dist/`.

- [ ] **Step 3: Remove duplicated/unused scaffold files**

```bash
rm frontend/.gitignore frontend/src/App.css frontend/src/assets/react.svg frontend/public/vite.svg
```

(The root `.gitignore` already covers `node_modules/`, `dist/`, etc. The demo CSS/SVG assets aren't used by Probekit.)

- [ ] **Step 4: Configure the `@/*` path alias**

In `frontend/tsconfig.app.json`, inside `compilerOptions`, add:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 5: Install the test harness**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 6: Rewrite `frontend/vite.config.ts`**

```ts
import path from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src")

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
  },
})
```

- [ ] **Step 7: Create `frontend/src/setupTests.ts`**

```ts
import "@testing-library/jest-dom"
```

- [ ] **Step 8: Add test scripts to `frontend/package.json`**

Inside `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 9: Write the failing smoke test**

Create `frontend/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("App", () => {
  it("renders the Probekit heading", () => {
    render(<App />)
    expect(screen.getByText(/probekit/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Run the test and confirm it fails**

Run: `npm run test`
Expected: FAIL — the default scaffolded `App.tsx` renders the Vite/React demo content, not "Probekit".

- [ ] **Step 11: Replace `frontend/src/App.tsx`**

```tsx
function App() {
  return (
    <main>
      <h1>Probekit</h1>
    </main>
  )
}

export default App
```

- [ ] **Step 12: Clear `frontend/src/index.css`**

Replace its contents with an empty file (Tailwind is wired in Task 2).

- [ ] **Step 13: Run the test again and confirm it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 14: Verify the build still works**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 15: Commit**

```bash
git add frontend package.json package-lock.json 2>/dev/null
git commit -m "chore(frontend): scaffold Vite + React + TypeScript with test harness"
```

(`package.json`/`package-lock.json` at the repo root are gitignored on purpose — see `.gitignore`'s `# AI` section — so the `2>/dev/null` just swallows git's "did not match any files" notice for them; only `frontend/` actually gets committed here.)

---

### Task 2: Tailwind CSS v4 wired to the Probekit/shadcn theme tokens

**Files:**
- Modify: `frontend/vite.config.ts`, `frontend/src/index.css`

**Interfaces:**
- Consumes: Task 1's `frontend/vite.config.ts` and `frontend/src/index.css`.
- Produces: Tailwind v4 active; utility classes for the raw Probekit tokens (`bg-page-ink`, `text-ash`, ...) and the shadcn semantic tokens (`bg-background`, `text-foreground`, `border-border`, ...) available project-wide; `--radius`, `--color-*`, `--background`, `--primary`, etc. as real CSS custom properties on `:root`.

- [ ] **Step 1: Install Tailwind**

```bash
cd frontend
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add the Tailwind plugin to `frontend/vite.config.ts`**

```ts
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src")

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
  },
})
```

- [ ] **Step 3: Replace `frontend/src/index.css`**

```css
@import "tailwindcss";

@theme {
  /* Raw design tokens — see ../design.md */
  --color-blue-cornflower: #6798ff;
  --color-page-ink: #0a0a0a;
  --color-card-carbon: #1e1e1e;
  --color-deep-coal: #141414;
  --color-onyx: #000000;
  --color-steel-border: #313131;
  --color-graphite: #454545;
  --color-fog: #7c7c7c;
  --color-ash: #a7a7a7;
  --color-snow: #ffffff;
  --color-signal-red: #e5484d;
  --color-signal-red-surface: #2a1214;

  --font-inter: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-jetbrains-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --text-caption: 12px;
  --text-body-sm: 14px;
  --text-body: 16px;
  --text-subheading: 20px;
  --text-heading-sm: 24px;
  --text-heading: 40px;
  --text-heading-lg: 56px;
  --text-display: 64px;

  --spacing-8: 8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-64: 64px;
  --spacing-96: 96px;
  --spacing-200: 200px;
}

/*
 * shadcn/ui semantic mapping — see frontend/design.md, "shadcn/ui Theme
 * Mapping". Kept as plain CSS variables (not @theme) so they can be
 * reassigned independently later (e.g. if a light theme is ever added).
 * Probekit is dark-only today, so there is a single :root block.
 */
:root {
  --background: var(--color-page-ink);
  --foreground: var(--color-snow);
  --card: var(--color-card-carbon);
  --card-foreground: var(--color-snow);
  --popover: var(--color-card-carbon);
  --popover-foreground: var(--color-snow);
  --primary: var(--color-snow);
  --primary-foreground: var(--color-page-ink);
  --secondary: var(--color-card-carbon);
  --secondary-foreground: var(--color-snow);
  --muted: var(--color-deep-coal);
  --muted-foreground: var(--color-ash);
  --accent: var(--color-card-carbon);
  --accent-foreground: var(--color-snow);
  --destructive: var(--color-signal-red);
  --destructive-foreground: var(--color-snow);
  --border: var(--color-steel-border);
  --input: var(--color-graphite);
  --ring: var(--color-blue-cornflower);
  --radius: 0.5rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-inter);
  }
}
```

- [ ] **Step 4: Build and verify the tokens compiled**

```bash
npm run build
grep -r "color-signal-red" frontend/dist/assets/*.css
```

Expected: `npm run build` succeeds, and the `grep` finds a match (proves the token pipeline — `@import` → `@theme` → build output — actually ran).

- [ ] **Step 5: Re-run the test suite**

Run: `npm run test`
Expected: PASS (unaffected by the CSS change).

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat(frontend): wire Tailwind v4 to the Probekit/shadcn theme tokens"
```

---

### Task 3: shadcn/ui primitives — Button, Card, Badge, Separator

**Files:**
- Create: `frontend/components.json`
- Create (via CLI): `frontend/src/components/ui/button.tsx`, `frontend/src/components/ui/card.tsx`, `frontend/src/components/ui/badge.tsx`, `frontend/src/components/ui/separator.tsx`, `frontend/src/lib/utils.ts`
- Test: `frontend/src/components/ui/button.test.tsx`, `frontend/src/components/ui/card.test.tsx`, `frontend/src/components/ui/badge.test.tsx`, `frontend/src/components/ui/separator.test.tsx`

**Interfaces:**
- Consumes: Task 2's Tailwind tokens (`components.json` points at `src/index.css`, `cssVariables: true`); Task 1's `@/*` alias.
- Produces: `Button` (`@/components/ui/button`, props `variant`, `size`, `asChild`), `Card`/`CardHeader`/`CardTitle`/`CardContent` (`@/components/ui/card`), `Badge` (`@/components/ui/badge`, prop `variant`), `Separator` (`@/components/ui/separator`), `cn()` (`@/lib/utils`).

- [ ] **Step 1: Write the failing Button test**

Create `frontend/src/components/ui/button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button } from "./button"

describe("Button", () => {
  it("renders as a button with its label", () => {
    render(<Button>Run ping</Button>)
    expect(screen.getByRole("button", { name: "Run ping" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Write the failing Card test**

Create `frontend/src/components/ui/card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

describe("Card", () => {
  it("renders header title and content together", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Ping</CardTitle>
        </CardHeader>
        <CardContent>Check latency to a host</CardContent>
      </Card>
    )
    expect(screen.getByText("Ping")).toBeInTheDocument()
    expect(screen.getByText("Check latency to a host")).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Write the failing Badge test**

Create `frontend/src/components/ui/badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "./badge"

describe("Badge", () => {
  it("renders its label text", () => {
    render(<Badge>Em breve</Badge>)
    expect(screen.getByText("Em breve")).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Write the failing Separator test**

Create `frontend/src/components/ui/separator.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Separator } from "./separator"

describe("Separator", () => {
  it("renders a divider element", () => {
    render(<Separator data-testid="divider" />)
    expect(screen.getByTestId("divider")).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run the tests and confirm they fail**

Run: `npm run test`
Expected: FAIL for all four — `./button`, `./card`, `./badge`, `./separator` don't exist yet.

- [ ] **Step 6: Create `frontend/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 7: Generate the primitives**

Run from `frontend/`:

```bash
npx shadcn@latest add button card badge separator
```

Expected: creates `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `separator.tsx`, and `src/lib/utils.ts`; adds `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`, `@radix-ui/react-separator`, `lucide-react` to `frontend/package.json`.

- [ ] **Step 8: Run the tests again and confirm they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 9: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 10: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add shadcn/ui Button, Card, Badge, Separator primitives"
```

---

### Task 4: Motion micro-interactions on Button and Card (and drop shadows)

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`, `frontend/src/components/ui/card.tsx`, `frontend/src/components/ui/button.test.tsx`, `frontend/src/components/ui/card.test.tsx`

**Interfaces:**
- Consumes: Task 3's `Button` (`frontend/src/components/ui/button.tsx`) and `Card` (`frontend/src/components/ui/card.tsx`).
- Produces: the same `Button`/`Card` exports and props — now Motion-animated on hover/tap and shadow-free. No signature changes; Task 3's and later tasks' call sites are unaffected.

- [ ] **Step 1: Write the failing "no shadow" tests**

Append to `frontend/src/components/ui/button.test.tsx`:

```tsx
it("has no box-shadow utility classes (Probekit's design system forbids shadows)", () => {
  render(<Button>Run ping</Button>)
  expect(screen.getByRole("button").className).not.toMatch(/shadow/)
})
```

Append to `frontend/src/components/ui/card.test.tsx`:

```tsx
it("has no box-shadow utility classes (Probekit's design system forbids shadows)", () => {
  render(<Card data-testid="card" />)
  expect(screen.getByTestId("card").className).not.toMatch(/shadow/)
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm run test`
Expected: FAIL for both — the generated `Button` ships `shadow-xs` and `Card` ships `shadow-sm`.

- [ ] **Step 3: Install Motion**

```bash
cd frontend
npm install motion
```

- [ ] **Step 4: Edit `frontend/src/components/ui/button.tsx`**

Add the import:

```ts
import { motion } from "motion/react"
```

Remove every `shadow-xs` substring from the `cva` variant class strings (default, destructive, outline, secondary all have it).

Replace the component body's `Comp` selection and return statement:

```tsx
const Comp = asChild ? Slot : "button"
const MotionComp = motion.create(Comp)

return (
  <MotionComp
    data-slot="button"
    className={cn(buttonVariants({ variant, size, className }))}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.15 }}
    {...props}
  />
)
```

- [ ] **Step 5: Edit `frontend/src/components/ui/card.tsx`**

Add the import:

```ts
import { motion } from "motion/react"
```

Remove the `shadow-sm` substring from the `Card` root's class string, and change the root element from `<div>` to `<motion.div>` with hover motion:

```tsx
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <motion.div
      data-slot="card"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6",
        className
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 6: Run the tests again and confirm they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat(frontend): animate Button/Card with Motion, drop shadows per design system"
```

---

### Task 5: Routing, placeholder pages, and animated route transitions

**Files:**
- Create: `frontend/src/pages/Home.tsx`, `frontend/src/pages/Ping.tsx`, `frontend/src/pages/DnsLookup.tsx`, `frontend/src/AnimatedRoutes.tsx`, `frontend/src/AnimatedRoutes.test.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1's `App.tsx`/`main.tsx`.
- Produces: `AnimatedRoutes` (`frontend/src/AnimatedRoutes.tsx`, named export, no props, must render under a Router), default exports `Home`/`Ping`/`DnsLookup` in `frontend/src/pages/`, `App` wrapping `MotionConfig` + `AnimatedRoutes`, `main.tsx` wrapping `BrowserRouter`.

- [ ] **Step 1: Install the router**

```bash
cd frontend
npm install react-router-dom
```

- [ ] **Step 2: Write the failing routing tests**

Create `frontend/src/AnimatedRoutes.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { AnimatedRoutes } from "./AnimatedRoutes"

describe("AnimatedRoutes", () => {
  it("renders the Ping placeholder page at /ping", () => {
    render(
      <MemoryRouter initialEntries={["/ping"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    expect(screen.getByRole("heading", { name: /ping/i })).toBeInTheDocument()
  })

  it("renders the DNS Lookup placeholder page at /dns-lookup", () => {
    render(
      <MemoryRouter initialEntries={["/dns-lookup"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    expect(screen.getByRole("heading", { name: /dns lookup/i })).toBeInTheDocument()
  })

  it("does not leave two pages mounted after navigating between routes in sequence", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/ping"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    rerender(
      <MemoryRouter initialEntries={["/dns-lookup"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm run test`
Expected: FAIL — `./AnimatedRoutes` doesn't exist yet.

- [ ] **Step 4: Create the placeholder pages**

Create `frontend/src/pages/Ping.tsx`:

```tsx
function Ping() {
  return (
    <main>
      <h1>Ping</h1>
      <p>Em breve.</p>
    </main>
  )
}

export default Ping
```

Create `frontend/src/pages/DnsLookup.tsx`:

```tsx
function DnsLookup() {
  return (
    <main>
      <h1>DNS Lookup</h1>
      <p>Em breve.</p>
    </main>
  )
}

export default DnsLookup
```

Create `frontend/src/pages/Home.tsx` (temporary placeholder — Task 7 replaces this with the real tool list):

```tsx
function Home() {
  return (
    <main>
      <h1>Probekit</h1>
    </main>
  )
}

export default Home
```

- [ ] **Step 5: Create `frontend/src/AnimatedRoutes.tsx`**

```tsx
import { AnimatePresence, motion } from "motion/react"
import { Route, Routes, useLocation } from "react-router-dom"
import DnsLookup from "./pages/DnsLookup"
import Home from "./pages/Home"
import Ping from "./pages/Ping"

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/ping" element={<Ping />} />
          <Route path="/dns-lookup" element={<DnsLookup />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 6: Rewrite `frontend/src/App.tsx`**

```tsx
import { MotionConfig } from "motion/react"
import { AnimatedRoutes } from "./AnimatedRoutes"

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatedRoutes />
    </MotionConfig>
  )
}

export default App
```

- [ ] **Step 7: Rewrite `frontend/src/main.tsx`**

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.tsx"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 8: Update `frontend/src/App.test.tsx` for the Router dependency**

`App` now calls `useLocation`/`Routes` internally, which throw without a Router ancestor. Replace the test body:

```tsx
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("App", () => {
  it("renders the Probekit heading at the root route", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/probekit/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 9: Run the full test suite and confirm it passes**

Run: `npm run test`
Expected: PASS — all suites, including the three new `AnimatedRoutes` tests.

- [ ] **Step 10: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 11: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add routing, placeholder pages, and animated route transitions"
```

---

### Task 6: Shared layout with header

**Files:**
- Create: `frontend/src/components/Header.tsx`, `frontend/src/components/Header.test.tsx`, `frontend/src/Layout.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: Task 5's `App.tsx` and `AnimatedRoutes`.
- Produces: `Header` (`frontend/src/components/Header.tsx`, named export, no props), `Layout` (`frontend/src/Layout.tsx`, named export, prop `children: ReactNode`), `App.tsx` now wraps `Layout`.

- [ ] **Step 1: Write the failing Header test**

Create `frontend/src/components/Header.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { Header } from "./Header"

describe("Header", () => {
  it("renders the Probekit site name as a link to the home page", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    const link = screen.getByRole("link", { name: /probekit/i })
    expect(link).toHaveAttribute("href", "/")
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test`
Expected: FAIL — `./Header` doesn't exist yet.

- [ ] **Step 3: Create `frontend/src/components/Header.tsx`**

```tsx
import { Link } from "react-router-dom"

export function Header() {
  return (
    <header className="border-b border-border px-8 py-4">
      <Link to="/" className="text-body font-medium text-foreground">
        Probekit
      </Link>
    </header>
  )
}
```

- [ ] **Step 4: Create `frontend/src/Layout.tsx`**

```tsx
import type { ReactNode } from "react"
import { Header } from "./components/Header"

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[1200px] px-8">
      <Header />
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Update `frontend/src/App.tsx`**

```tsx
import { MotionConfig } from "motion/react"
import { AnimatedRoutes } from "./AnimatedRoutes"
import { Layout } from "./Layout"

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </MotionConfig>
  )
}

export default App
```

- [ ] **Step 6: Run the full test suite and confirm it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add shared Header/Layout"
```

---

### Task 7: Home page with the static tool list

**Files:**
- Create: `frontend/src/lib/tools.ts`, `frontend/src/components/ToolCard.tsx`, `frontend/src/components/ToolCard.test.tsx`, `frontend/src/pages/Home.test.tsx`
- Modify: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: Task 3/4's `Button`, `Badge`, `Card`/`CardHeader`/`CardTitle`/`CardContent`, `Separator`; Task 5's `Home.tsx` placeholder (overwritten here).
- Produces: `Tool` interface and `tools` array (`frontend/src/lib/tools.ts`, named exports), `ToolCard` (`frontend/src/components/ToolCard.tsx`, named export, props = `Tool`), `Home` default export rendering the full list.

- [ ] **Step 1: Create `frontend/src/lib/tools.ts`**

```ts
export interface Tool {
  name: string
  description: string
  href: string
}

export const tools: Tool[] = [
  {
    name: "Ping",
    description: "Meça latência, perda de pacotes e jitter até um host.",
    href: "/ping",
  },
  {
    name: "DNS Lookup",
    description: "Consulte os registros DNS de um domínio.",
    href: "/dns-lookup",
  },
]
```

- [ ] **Step 2: Write the failing ToolCard test**

Create `frontend/src/components/ToolCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { ToolCard } from "./ToolCard"

describe("ToolCard", () => {
  it("renders the tool name, description, an 'Em breve' badge, and links to its route", () => {
    render(
      <MemoryRouter>
        <ToolCard name="Ping" description="Measure latency" href="/ping" />
      </MemoryRouter>
    )
    expect(screen.getByText("Ping")).toBeInTheDocument()
    expect(screen.getByText("Measure latency")).toBeInTheDocument()
    expect(screen.getByText(/em breve/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ping/i })).toHaveAttribute("href", "/ping")
  })
})
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npm run test`
Expected: FAIL — `./ToolCard` doesn't exist yet.

- [ ] **Step 4: Create `frontend/src/components/ToolCard.tsx`**

```tsx
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Tool } from "@/lib/tools"

export function ToolCard({ name, description, href }: Tool) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{name}</CardTitle>
        <Badge variant="outline">Em breve</Badge>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col gap-4 pt-6">
        <p className="text-body-sm text-muted-foreground">{description}</p>
        <Button asChild>
          <Link to={href}>Abrir</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Run the test again and confirm it passes**

Run: `npm run test`
Expected: PASS for `ToolCard`.

- [ ] **Step 6: Write the failing Home page test**

Create `frontend/src/pages/Home.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { tools } from "@/lib/tools"
import Home from "./Home"

describe("Home", () => {
  it("renders one link per tool in the static list, pointing at its route", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    const links = tools.map((tool) =>
      screen.getByRole("link", { name: new RegExp(tool.name, "i") })
    )

    expect(links).toHaveLength(tools.length)
    links.forEach((link, index) => {
      expect(link).toHaveAttribute("href", tools[index].href)
    })
  })
})
```

This iterates the real `tools` array rather than a hardcoded count, so adding a third tool later can't silently break the "no layout change needed" guarantee (Review Focus #1).

- [ ] **Step 7: Run the test and confirm it fails**

Run: `npm run test`
Expected: FAIL — the current `Home.tsx` (from Task 5) only renders an `<h1>`, no links.

- [ ] **Step 8: Replace `frontend/src/pages/Home.tsx`**

```tsx
import { ToolCard } from "@/components/ToolCard"
import { tools } from "@/lib/tools"

function Home() {
  return (
    <main className="flex flex-col gap-8 py-16">
      <h1 className="text-heading font-semibold text-foreground">Probekit</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </main>
  )
}

export default Home
```

- [ ] **Step 9: Run the full test suite and confirm it passes**

Run: `npm run test`
Expected: PASS — all suites.

- [ ] **Step 10: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 11: Commit**

```bash
git add frontend
git commit -m "feat(frontend): render the home page tool list from a static array"
```

---

### Task 8: Lint, format, and final verification

**Files:**
- Create: `frontend/.prettierrc`
- Modify: `frontend/eslint.config.js`, `frontend/package.json`

**Interfaces:**
- Consumes: the entire `frontend/` tree built by Tasks 1–7.
- Produces: `npm run lint` and `npm run format`/`format:check` scripts; no runtime exports change.

- [ ] **Step 1: Install Prettier and its ESLint integration**

```bash
cd frontend
npm install -D prettier eslint-config-prettier
```

- [ ] **Step 2: Create `frontend/.prettierrc`**

```json
{
  "semi": false
}
```

- [ ] **Step 3: Add scripts to `frontend/package.json`**

Inside `"scripts"`, add:

```json
"lint": "eslint .",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 4: Wire Prettier into ESLint**

Open the scaffold-generated `frontend/eslint.config.js`. Add near the other imports:

```js
import eslintConfigPrettier from "eslint-config-prettier"
```

Add `eslintConfigPrettier` as the **last** entry in the exported config array, so it overrides any conflicting stylistic rule from the earlier configs.

- [ ] **Step 5: Format the codebase**

Run: `npm run format`
Expected: succeeds; reports the files it reformatted (first run, so changes are expected).

- [ ] **Step 6: Lint the codebase**

Run: `npm run lint`
Expected: no errors. If it reports any, fix them in the flagged files before continuing.

- [ ] **Step 7: Run the full verification**

```bash
npm run test
npm run build
```

Expected: both succeed.

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "chore(frontend): add Prettier and wire it into ESLint"
```
