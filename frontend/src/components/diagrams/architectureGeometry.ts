import { percentAt, startOf } from "./pathSampler"
import type { Cloud } from "./svgParts"

/*
 * Geometria e cores das ligações do ArchitectureDiagram, fora do componente
 * para os testes conferirem a cor do ponto contra os caminhos.
 */
// Trechos visíveis das ligações (de borda a borda de bloco).
export const lines = {
  frontend: "M46 174 V116 Q46 104 58 104 H136",
  entrega: "M308 104 H372",
  backend: "M46 238 V296 Q46 308 58 308 H136",
  origem: "M308 308 H348",
  vm1: "M448 308 H458 Q470 308 470 296 V280 Q470 268 482 268",
  vm2: "M448 308 H458 Q470 308 470 320 V336 Q470 348 482 348",
}
export type LineKey = keyof typeof lines

// Cor de cada ligação: a de quem a envia. O cliente não é uma cloud, então o
// que sai dele fica em cinza (undefined). O que sai do Workers e do Proxy é
// Cloudflare, e o que sai do NLB é Oracle.
export const lineCloud: Record<LineKey, Cloud | undefined> = {
  frontend: undefined,
  entrega: "cloudflare",
  backend: undefined,
  origem: "cloudflare",
  vm1: "oracle",
  vm2: "oracle",
}

// Caminhos completos dos pontos: começam no centro do Cliente e terminam no
// centro do bloco de destino, passando por dentro dos blocos (escondidos).
export const packetPaths = {
  frontend: "M46 206 V116 Q46 104 58 104 H442",
  vm1: "M46 206 V296 Q46 308 58 308 H458 Q470 308 470 296 V280 Q470 268 482 268 H528",
  vm2: "M46 206 V296 Q46 308 58 308 H458 Q470 308 470 320 V336 Q470 348 482 348 H528",
}

// As ligações que cada ponto percorre, em ordem.
export const packetLinks: Record<keyof typeof packetPaths, LineKey[]> = {
  frontend: ["frontend", "entrega"],
  vm1: ["backend", "origem", "vm1"],
  vm2: ["backend", "origem", "vm2"],
}

export type TintStop = readonly [Cloud | undefined, number]

/**
 * Cor do ponto ao longo do caminho: [cor, % do percurso em que começa]. O ponto
 * veste a cor da ligação em que está; dentro de um bloco fica escondido, então
 * mantém a cor anterior até a próxima ligação começar. Os % saem da geometria
 * (onde o caminho do ponto passa pelo início de cada ligação), e não de números
 * escritos à mão.
 */
export function tintStops(path: keyof typeof packetPaths): TintStop[] {
  return packetLinks[path].map((key, index) => [
    lineCloud[key],
    index === 0 ? 0 : percentAt(packetPaths[path], startOf(lines[key])),
  ])
}
