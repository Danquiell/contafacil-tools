import { useEffect, useState } from "react"
import "./style.css"

type LicenseStatus = "unchecked" | "valid" | "invalid"

export default function Popup() {
  const [licenseKey, setLicenseKey] = useState("")
  const [status, setStatus] = useState<LicenseStatus>("unchecked")
  const [savedKey, setSavedKey] = useState("")

  useEffect(() => {
    chrome.storage.local.get(["licenseKey", "licenseValid"], (result) => {
      if (result.licenseKey) {
        setSavedKey(result.licenseKey)
        setStatus(result.licenseValid ? "valid" : "invalid")
      }
    })
  }, [])

  function activateLicense() {
    const key = licenseKey.trim()
    if (!key) return

    // Validação local por enquanto (substituir pela API do LemonSqueezy depois)
    const isValid = key.startsWith("CFT-") && key.length === 20
    chrome.storage.local.set({ licenseKey: key, licenseValid: isValid })
    setSavedKey(key)
    setStatus(isValid ? "valid" : "invalid")
  }

  return (
    <div className="popup">
      <div className="header">
        <span className="logo">CF</span>
        <div>
          <h1>ContaFácil Tools</h1>
          <p className="version">v0.1.0</p>
        </div>
      </div>

      {status === "valid" ? (
        <div className="features">
          <p className="license-ok">✓ Licença ativa: {savedKey}</p>
          <h2>Funcionalidades ativas:</h2>
          <ul>
            <li>📥 Export de tabelas → CSV/Excel</li>
            <li>📦 Download em lote de documentos</li>
            <li>🔔 Monitor de intimações fiscais</li>
            <li>✏️ Auto-preenchimento de formulários</li>
          </ul>
          <p className="hint">Acesse o e-CAC ou qualquer portal do governo para usar as ferramentas.</p>
        </div>
      ) : (
        <div className="activation">
          {status === "invalid" && (
            <p className="error">Chave inválida. Verifique e tente novamente.</p>
          )}
          <p className="desc">
            Insira sua chave de licença para ativar as funcionalidades.
          </p>
          <input
            type="text"
            placeholder="CFT-XXXX-XXXX-XXXX"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && activateLicense()}
          />
          <button onClick={activateLicense}>Ativar Licença</button>
          <a href="https://contafaciltools.com.br" target="_blank" className="buy-link">
            Ainda não tem licença? Adquira aqui →
          </a>
        </div>
      )}
    </div>
  )
}
