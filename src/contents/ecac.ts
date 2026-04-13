/**
 * ContaFácil Tools — Content Script
 * Roda dentro dos portais fiscais: e-CAC, eSocial, Simples Nacional, etc.
 *
 * O que faz:
 * 1. exportTableToCSV  — adiciona botão de export em toda tabela detectada
 * 2. injectDownloadAll — adiciona botão de download em lote na listagem de documentos
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "https://cav.receita.fazenda.gov.br/*",
    "https://www.receita.fazenda.gov.br/*",
    "https://servicos.receita.fazenda.gov.br/*",
    "https://esocial.fazenda.gov.br/*",
    "https://www8.receita.fazenda.gov.br/*",
    "https://portal.esocial.gov.br/*",
    "https://*.esocial.gov.br/*"
  ],
  run_at: "document_idle"
}

// ─── Utilitários ───────────────────────────────────────────────────────────

function isLicenseValid(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["licenseValid"], (result) => {
      resolve(result.licenseValid === true)
    })
  })
}

function createButton(label: string, onClick: () => void, color = "#3b82f6"): HTMLButtonElement {
  const btn = document.createElement("button")
  btn.textContent = label
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    margin: 4px 4px;
    border-radius: 6px;
    border: none;
    background: ${color};
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: opacity 0.15s;
    z-index: 9999;
    position: relative;
  `
  btn.addEventListener("mouseenter", () => (btn.style.opacity = "0.85"))
  btn.addEventListener("mouseleave", () => (btn.style.opacity = "1"))
  btn.addEventListener("click", onClick)
  return btn
}

function showToast(message: string, isError = false) {
  const toast = document.createElement("div")
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 28px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${isError ? "#dc2626" : "#16a34a"};
    color: white;
    font-size: 14px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    z-index: 999999;
    transition: opacity 0.4s;
  `
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = "0"
    setTimeout(() => toast.remove(), 400)
  }, 3000)
}

// ─── Feature 1: Export de Tabelas → CSV ─────────────────────────────────────

function tableToCSV(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll("tr"))
  return rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("th, td"))
    return cells
      .map((cell) => {
        const text = (cell as HTMLElement).innerText.trim().replace(/\n/g, " ")
        // Envolve em aspas se tiver vírgula ou aspas
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      })
      .join(",")
  }).join("\n")
}

function downloadCSV(csv: string, filename: string) {
  const bom = "\uFEFF" // BOM para o Excel reconhecer UTF-8
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function injectExportButtons(tables: NodeListOf<HTMLTableElement>) {
  tables.forEach((table, index) => {
    // Evita duplicar botões
    if (table.dataset.cftInjected) return
    table.dataset.cftInjected = "1"

    const wrapper = document.createElement("div")
    wrapper.style.cssText = "margin: 6px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px;"

    const csvBtn = createButton("📥 Exportar CSV", () => {
      const csv = tableToCSV(table)
      const date = new Date().toISOString().split("T")[0]
      downloadCSV(csv, `ecac-tabela-${index + 1}-${date}.csv`)
      showToast("Tabela exportada com sucesso!")
    }, "#16a34a")

    const copyBtn = createButton("📋 Copiar tabela", () => {
      const csv = tableToCSV(table)
      navigator.clipboard.writeText(csv).then(() => showToast("Tabela copiada para área de transferência!"))
    }, "#0369a1")

    wrapper.appendChild(csvBtn)
    wrapper.appendChild(copyBtn)

    // Insere o wrapper ANTES da tabela
    table.parentNode?.insertBefore(wrapper, table)
  })
}

// ─── Feature 2: Download em lote de documentos ──────────────────────────────

function findDocumentLinks(): HTMLAnchorElement[] {
  // Seletores comuns nos portais da Receita
  const selectors = [
    'a[href*=".pdf"]',
    'a[href*="download"]',
    'a[href*="Download"]',
    'a[href*="certidao"]',
    'a[href*="comprovante"]',
    'a[href*="declaracao"]',
  ]
  const links = new Set<HTMLAnchorElement>()
  selectors.forEach((sel) => {
    document.querySelectorAll<HTMLAnchorElement>(sel).forEach((a) => links.add(a))
  })
  return Array.from(links)
}

function injectDownloadAllButton(links: HTMLAnchorElement[]) {
  if (links.length < 2) return
  if (document.getElementById("cft-download-all")) return

  const container = document.createElement("div")
  container.id = "cft-download-all"
  container.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `

  const badge = document.createElement("span")
  badge.textContent = `${links.length} documentos detectados`
  badge.style.cssText = `
    background: #1e293b;
    color: #94a3b8;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `

  const dlBtn = createButton(`📦 Baixar todos (${links.length})`, async () => {
    dlBtn.textContent = "⏳ Baixando..."
    dlBtn.disabled = true

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const a = document.createElement("a")
      a.href = link.href
      a.download = link.download || `documento-${i + 1}.pdf`
      a.click()
      await new Promise((r) => setTimeout(r, 800)) // evita bloqueio do browser
    }

    dlBtn.textContent = "✓ Downloads iniciados"
    showToast(`${links.length} downloads iniciados!`)
  }, "#7c3aed")

  container.appendChild(badge)
  container.appendChild(dlBtn)
  document.body.appendChild(container)
}

// ─── Inicialização ───────────────────────────────────────────────────────────

async function init() {
  const valid = await isLicenseValid()
  if (!valid) return // Sem licença, não injeta nada

  // Export de tabelas — roda imediatamente
  const tables = document.querySelectorAll<HTMLTableElement>("table")
  if (tables.length > 0) {
    injectExportButtons(tables)
  }

  // Download em lote
  const docLinks = findDocumentLinks()
  if (docLinks.length >= 2) {
    injectDownloadAllButton(docLinks)
  }

  // Observer para tabelas carregadas dinamicamente (portais com AJAX)
  const observer = new MutationObserver(() => {
    const newTables = document.querySelectorAll<HTMLTableElement>("table:not([data-cft-injected])")
    if (newTables.length > 0) injectExportButtons(newTables)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

init()
