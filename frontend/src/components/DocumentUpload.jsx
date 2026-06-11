import { useState, useCallback } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const ACCEPTED = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg"

export default function DocumentUpload({ onUploaded }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState([])
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback(newFiles => {
    setFiles(prev => [
      ...prev,
      ...Array.from(newFiles).filter(f =>
        !prev.find(p => p.name === f.name)
      ),
    ])
  }, [])

  const onDrop = e => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  async function uploadAll() {
    setUploading(true)
    const newResults = []

    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await fetch(`${API}/upload`, { method: "POST", body: formData })
        const data = await res.json()
        newResults.push({ filename: file.name, ...data, ok: true })
      } catch {
        newResults.push({ filename: file.name, ok: false, error: "Upload failed" })
      }
    }

    setResults(newResults)
    setFiles([])
    setUploading(false)
    if (newResults.every(r => r.ok)) onUploaded?.()
  }

  return (
    <div className="upload-page">
      <h2 className="page-title">Upload documents</h2>
      <p className="page-sub">
        Supports PDF, DOCX, XLSX, PNG, and JPEG. Files are parsed, chunked, and
        indexed for AI-powered question answering.
      </p>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragging ? "dragging" : ""}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input").click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={ACCEPTED}
          style={{ display: "none" }}
          onChange={e => addFiles(e.target.files)}
        />
        <div className="drop-icon">📂</div>
        <p className="drop-text">
          {dragging ? "Drop files here" : "Click to browse or drag files here"}
        </p>
        <p className="drop-hint">PDF · DOCX · XLSX · PNG · JPEG</p>
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="file-queue">
          {files.map(f => (
            <div key={f.name} className="file-item">
              <span className="file-name">{f.name}</span>
              <span className="file-size">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                className="remove-btn"
                onClick={() => setFiles(prev => prev.filter(p => p.name !== f.name))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="upload-btn"
            onClick={uploadAll}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="upload-results">
          {results.map((r, i) => (
            <div key={i} className={`result-item ${r.ok ? "result-ok" : "result-err"}`}>
              <span>{r.ok ? "✓" : "✗"} {r.filename}</span>
              {r.ok && (
                <span className="result-stats">
                  {r.chunks_created} chunks · {r.tables_extracted} tables · {r.images_described} images
                </span>
              )}
              {!r.ok && <span className="result-error">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
