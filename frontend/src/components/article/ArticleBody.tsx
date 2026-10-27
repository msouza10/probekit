import type { ComponentProps } from "react"
import type { Element, Root, RootContent } from "hast"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { Link } from "react-router-dom"
import { inlineLink } from "@/components/page/classes"
import { isSafeUrl } from "@/lib/safeUrl"
import { cn } from "@/lib/utils"
import { ArticleDiagram } from "./articleDiagrams"

/*
 * Transforma a árvore compilada de um artigo (`vite/compileArticle.ts`) em
 * React, com os componentes do site. O compilador já descarta HTML cru e links
 * perigosos; `sanitize` repete a regra aqui, como segunda defesa, para o corpo
 * nunca depender de uma única barreira. Sem `dangerouslySetInnerHTML`.
 */

// Elementos que um artigo nunca precisa e que não devem chegar ao DOM.
const FORBIDDEN = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
])
const URL_PROPERTIES = ["href", "src"]

function sanitizeChildren<T extends RootContent>(children: T[]): T[] {
  return children.flatMap((child) => {
    if (child.type !== "element") return [child]
    if (FORBIDDEN.has(child.tagName)) return []
    return [sanitizeElement(child) as T]
  })
}

function sanitizeElement(node: Element): Element {
  const properties = { ...node.properties }
  for (const key of Object.keys(properties)) {
    const value = properties[key]
    const unsafeUrl =
      URL_PROPERTIES.includes(key) &&
      typeof value === "string" &&
      !isSafeUrl(value)
    if (/^on/i.test(key) || unsafeUrl) delete properties[key]
  }
  return {
    ...node,
    properties,
    children: sanitizeChildren(node.children),
  }
}

const sanitize = (tree: Root): Root => ({
  ...tree,
  children: sanitizeChildren(tree.children),
})

// Texto corrido tem medida de leitura; figuras, código e tabelas usam a coluna.
const measure = "max-w-[38rem]"

const Heading2 = (props: ComponentProps<"h2">) => (
  <h2
    {...props}
    className={`${measure} scroll-mt-[calc(var(--header-height)+24px)] border-t border-border pt-8 text-heading-sm text-foreground`}
  />
)

const Heading3 = (props: ComponentProps<"h3">) => (
  <h3
    {...props}
    className={`${measure} scroll-mt-[calc(var(--header-height)+24px)] text-body-lg font-medium text-foreground`}
  />
)

const Paragraph = (props: ComponentProps<"p">) => (
  <p {...props} className={measure} />
)

function Anchor({ href, children, ...rest }: ComponentProps<"a">) {
  if (href?.startsWith("/"))
    return (
      <Link to={href} className={inlineLink}>
        {children}
      </Link>
    )
  const external = href !== undefined && /^https?:/i.test(href)
  return (
    <a
      {...rest}
      href={href}
      className={inlineLink}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  )
}

const UnorderedList = (props: ComponentProps<"ul">) => (
  <ul
    {...props}
    className={`${measure} flex list-disc flex-col gap-2 pl-6 marker:text-muted-foreground`}
  />
)

const OrderedList = (props: ComponentProps<"ol">) => (
  <ol
    {...props}
    className={`${measure} flex list-decimal flex-col gap-2 pl-6 marker:text-muted-foreground`}
  />
)

const Quote = (props: ComponentProps<"blockquote">) => (
  <blockquote
    {...props}
    className={`${measure} border-l-2 border-border pl-4 text-muted-foreground`}
  />
)

const Pre = ({ className, ...rest }: ComponentProps<"pre">) => (
  <pre
    {...rest}
    className={cn(
      "overflow-x-auto rounded-md border border-border bg-card p-4 font-mono text-body-sm",
      className,
    )}
  />
)

const Table = (props: ComponentProps<"table">) => (
  <div className="overflow-x-auto">
    <table
      {...props}
      className="w-full border-collapse text-left text-body-sm"
    />
  </div>
)

const HeaderCell = (props: ComponentProps<"th">) => (
  <th
    {...props}
    className="border-b border-border px-3 py-2 font-sans font-medium text-foreground"
  />
)

const Cell = (props: ComponentProps<"td">) => (
  <td {...props} className="border-b border-border px-3 py-2 align-top" />
)

const Image = (props: ComponentProps<"img">) => (
  <img {...props} className="h-auto max-w-full rounded-md" />
)

const components = {
  h2: Heading2,
  h3: Heading3,
  p: Paragraph,
  a: Anchor,
  ul: UnorderedList,
  ol: OrderedList,
  blockquote: Quote,
  pre: Pre,
  table: Table,
  th: HeaderCell,
  td: Cell,
  img: Image,
  "article-diagram": ({ name }: { name: string }) => (
    <ArticleDiagram name={name} />
  ),
}

export function ArticleBody({ tree }: { tree: Root }) {
  return (
    <div className="flex flex-col gap-5 text-body text-foreground/90 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em]">
      {toJsxRuntime(sanitize(tree), { Fragment, jsx, jsxs, components })}
    </div>
  )
}
