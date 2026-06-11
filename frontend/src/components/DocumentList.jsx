import { useState, useEffect } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const TYPE_ICONS = {
  pdf:   "📄",
  docx:  "📝",
  xlsx:  "📊",
  image: "🖼️",
  table: "📋",
  text:  "📄",
}

export default function DocumentList() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchDocs() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/documents`)
      const data = await res.json()
      setDocs(data.documents || [])
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  async function deleteDoc(filename) {
    await fetch(`${API}/documents/${encodeURIComponent(filename)}`, { method: "DELETE" })
    fetchDocs()
  }

  if (loading) return <div className="loading-msg">Loading library…</div>

  return (
    <div className="doc-list-page">
      <div className="page-header-row">
        <h2 className="page-title">Document library</h2>
        <button className="refresh-btn" onClick={fetchDocs}>Refresh</button>
      </div>

      {docs.length === 0 ? (
        <div className="empty-library">
          <p>No documents indexed yet.</p>
          <p>Upload some files to get started.</p>
        </div>
      ) : (
        <div className="doc-grid">
          {docs.map((doc, i) => (
            <div key={i} className="doc-card">
              <span className="doc-icon">{TYPE_ICONS[doc.type] || "📄"}</span>
              <div className="doc-info">
                <span className="doc-name">{doc.filename}</span>
                <span className="doc-type">{doc.type}</span>
              </div>
              <button
                className="delete-btn"
                onClick={() => deleteDoc(doc.filename)}
                title="Remove from index"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
