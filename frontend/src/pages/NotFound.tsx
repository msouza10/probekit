import { Link } from "react-router-dom"

function NotFound() {
  return (
    <main>
      <h1>Página não encontrada</h1>
      <p>
        <Link to="/">Voltar para a página inicial</Link>
      </p>
    </main>
  )
}

export default NotFound
