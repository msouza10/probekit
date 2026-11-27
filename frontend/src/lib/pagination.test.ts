import { describe, expect, it } from "vitest"
import { pageCount, pageSlice, pageWindow } from "./pagination"

/* A conta das páginas: quantas são, que itens cada uma tem e quais números mostrar. */

describe("pageCount", () => {
  it.each([
    [0, 12, 0],
    [1, 12, 1],
    [12, 12, 1],
    [13, 12, 2],
    [30, 12, 3],
  ])("%i itens em páginas de %i dão %i páginas", (itens, tamanho, esperado) => {
    expect(pageCount(itens, tamanho)).toBe(esperado)
  })
})

describe("pageSlice", () => {
  const lista = Array.from({ length: 30 }, (_, i) => i + 1)

  it("devolve os itens da página pedida", () => {
    expect(pageSlice(lista, 1, 12)).toEqual(lista.slice(0, 12))
    expect(pageSlice(lista, 3, 12)).toEqual([25, 26, 27, 28, 29, 30])
  })

  it("página fora do intervalo é ajustada para a mais próxima", () => {
    expect(pageSlice(lista, 0, 12)).toEqual(lista.slice(0, 12))
    expect(pageSlice(lista, 99, 12)).toEqual([25, 26, 27, 28, 29, 30])
  })

  it("lista vazia dá lista vazia", () => {
    expect(pageSlice([], 1, 12)).toEqual([])
  })
})

describe("pageWindow", () => {
  it("poucas páginas aparecem todas", () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it("sem páginas, não há números", () => {
    expect(pageWindow(1, 0)).toEqual([])
  })

  it("no começo, fica a primeira, a vizinha e a última", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, "…", 10])
  })

  it("no meio, a primeira, as vizinhas e a última, com reticências dos dois lados", () => {
    expect(pageWindow(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10])
  })

  it("um buraco de uma só página mostra a página, não as reticências", () => {
    expect(pageWindow(4, 10)).toEqual([1, 2, 3, 4, 5, "…", 10])
    expect(pageWindow(7, 10)).toEqual([1, "…", 6, 7, 8, 9, 10])
  })

  it("no fim, fica a primeira, a vizinha e a última", () => {
    expect(pageWindow(10, 10)).toEqual([1, "…", 9, 10])
  })
})
