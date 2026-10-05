function Sobre() {
  return (
    <main className="flex flex-col gap-6 py-16">
      <h1 className="text-heading font-semibold text-foreground">
        Sobre o Probekit
      </h1>
      <div className="flex max-w-[65ch] flex-col gap-4 text-body text-muted-foreground">
        <p>
          O Probekit é uma caixa de ferramentas técnicas pensada pra resolver
          tarefas reais — rede, arquivos, texto, cron e outros utilitários — de
          um jeito simples de acessar e usar.
        </p>
        <p>
          O catálogo começa pequeno (ping e consulta de DNS) e cresce aos
          poucos, conforme surgem necessidades reais. Não tem conta nem login: é
          só acessar e usar.
        </p>
        <p>
          O projeto também funciona como um laboratório pessoal de DevOps, com
          infraestrutura como código e automação de CI/CD por trás de cada
          ferramenta.
        </p>
      </div>
    </main>
  )
}

export default Sobre
