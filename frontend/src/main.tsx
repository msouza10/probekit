import { StrictMode } from "react"
import { BrowserRouter } from "react-router-dom"
import "@fontsource-variable/newsreader"
import "@fontsource-variable/newsreader/wght-italic.css"
import "@fontsource-variable/inter"
import "@fontsource-variable/jetbrains-mono"
import App from "./App.tsx"
import { mount } from "./mount.tsx"
import "./index.css"

mount(
  document.getElementById("root")!,
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
