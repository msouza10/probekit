/*
 * Regra única para links e imagens vindos de conteúdo (artigos): caminhos
 * relativos, âncoras e os protocolos http, https e mailto. Usada no build
 * (`vite/compileArticle.ts`) e de novo na hora de renderizar, como segunda
 * defesa.
 */
const SAFE_SCHEMES = new Set(["http", "https", "mailto"])

export function isSafeUrl(value: string): boolean {
  // Espaços e caracteres de controle não contam para o navegador ("java\tscript:").
  // eslint-disable-next-line no-control-regex
  const compact = value.replace(/[\u0000- \u007f]/g, "")
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase()
  return !scheme || SAFE_SCHEMES.has(scheme)
}
