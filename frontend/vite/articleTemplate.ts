/*
 * O arquivo de um artigo novo, já no formato certo (ver
 * `docs/runbook-artigos.md`): cabeçalho válido e um esqueleto com textos TODO a
 * preencher. Usado por `scripts/newArticle.mjs`. O texto sai como o Prettier o
 * deixa, porque o `format:check` do CI cobre os `.md` de `content/articles`, e
 * o conferidor (`articleChecks.ts`) avisa de qualquer TODO que sobrar.
 */
const DEFAULT_DESCRIPTION =
  "TODO: resumo do artigo em até 160 caracteres, que aparece no buscador e na pré-visualização."

export function articleTemplate(input: {
  title: string
  description?: string
  /** AAAA-MM-DD. */
  date: string
}): string {
  // JSON é YAML válido: as aspas e os dois-pontos do texto saem escapados.
  const yamlText = (text: string) => JSON.stringify(text)
  return [
    "---",
    `title: ${yamlText(input.title)}`,
    `description: ${yamlText(input.description ?? DEFAULT_DESCRIPTION)}`,
    `date: ${input.date}`,
    "---",
    "",
    "TODO: abra com uma situação reconhecível ou com o que o leitor vai conseguir fazer.",
    "",
    "## TODO: primeira seção",
    "",
    "TODO: dê o contexto antes dos comandos e explique por que cada escolha ajuda.",
    "",
    "## TODO: segunda seção",
    "",
    "TODO: mostre como conferir o resultado e o que fazer se ele não bater.",
    "",
    "## Referências",
    "",
    "- TODO: fontes primárias que sustentam as afirmações técnicas.",
    "",
  ].join("\n")
}
