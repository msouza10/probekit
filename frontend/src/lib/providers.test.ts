import { describe, expect, it } from "vitest"
import { providerId, providerKey, providerName } from "./providers"

/*
 * O campo `vendor` vem do LLM, em texto livre: "aws", "AWS", "Amazon Web
 * Services", "Google Cloud", "GCP"... A página precisa tratar tudo isso como um
 * provider só, para o logo, o nome e o filtro.
 */

describe("providerKey", () => {
  it.each([
    ["aws", "aws"],
    ["AWS", "aws"],
    ["Amazon Web Services", "aws"],
    ["Amazon Web Services (AWS)", "aws"],
    ["AWS Training and Certification", "aws"],
    ["microsoft", "microsoft"],
    ["Microsoft Azure", "microsoft"],
    ["Microsoft Learn", "microsoft"],
    ["Google", "google"],
    ["Google Cloud", "google"],
    ["Google Cloud Platform", "google"],
    ["GCP", "google"],
    ["Cisco", "cisco"],
    ["Cisco Systems", "cisco"],
    ["CompTIA", "comptia"],
    ["HashiCorp", "hashicorp"],
    ["Linux Foundation", "linux-foundation"],
    ["The Linux Foundation", "linux-foundation"],
    ["CNCF", "linux-foundation"],
    ["Red Hat", "red-hat"],
    ["redhat", "red-hat"],
    ["VMware", "vmware"],
    ["Canonical", "canonical"],
    ["Ubuntu", "canonical"],
    ["Oracle", "oracle"],
  ])("%s -> %s", (vendor, key) => {
    expect(providerKey(vendor)).toBe(key)
  })

  it("provider desconhecido, vazio ou ausente não tem chave", () => {
    expect(providerKey("Tutorials Dojo")).toBeNull()
    expect(providerKey("   ")).toBeNull()
    expect(providerKey(null)).toBeNull()
    expect(providerKey(undefined)).toBeNull()
  })

  it("não confunde pedaço de palavra com o provider", () => {
    // "awsome" não é "aws" e "ciscorp" não é "cisco".
    expect(providerKey("awsome labs")).toBeNull()
    expect(providerKey("ciscorp")).toBeNull()
  })

  it("ignora acentos e pontuação", () => {
    expect(providerKey("Microsoft®")).toBe("microsoft")
    expect(providerKey("  AWS,  ")).toBe("aws")
  })
})

describe("providerId", () => {
  it("nomes diferentes do mesmo provider têm o mesmo id", () => {
    expect(providerId("Google Cloud")).toBe(providerId("google"))
    expect(providerId("Amazon Web Services")).toBe("aws")
  })

  it("desconhecido usa o próprio nome normalizado; vazio vira texto vazio", () => {
    expect(providerId("Tutorials  Dojo")).toBe("tutorials dojo")
    expect(providerId(null)).toBe("")
  })
})

describe("providerName", () => {
  it.each([
    ["aws", "AWS"],
    ["microsoft", "Microsoft"],
    ["google cloud", "Google Cloud"],
    ["comptia", "CompTIA"],
    ["hashicorp", "HashiCorp"],
    ["linux foundation", "Linux Foundation"],
    ["vmware", "VMware"],
    ["red hat", "Red Hat"],
  ])("%s -> %s", (vendor, nome) => {
    expect(providerName(vendor)).toBe(nome)
  })

  it("desconhecido: até 4 letras em maiúsculas, senão cada palavra com inicial maiúscula", () => {
    expect(providerName("sas")).toBe("SAS")
    expect(providerName("tutorials dojo")).toBe("Tutorials Dojo")
    expect(providerName("neo4j")).toBe("Neo4j")
  })
})
