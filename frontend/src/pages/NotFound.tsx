import { Link } from "react-router-dom"

export function NotFound() {
  return (
    <main className="flex flex-col gap-6 pt-12 pb-8 sm:pt-20">
      <h1 className="text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg">
        Página não encontrada
      </h1>
      <p className="max-w-[36rem] text-body-lg text-muted-foreground">
        Esse endereço não existe aqui. Pode ter sido digitado errado, ou a
        ferramenta ainda não saiu do papel.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-11 w-fit items-center font-sans text-body-sm font-medium text-foreground underline decoration-highlight underline-offset-4 transition-colors hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Voltar para a página inicial
      </Link>
    </main>
  )
}

export default NotFound
