import { useState } from "react"

export default function SourceCitations({ sources }) {
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) return null

  // Deduplicate by filename
  const unique = sources.filter(
    (s, i, arr) => arr.findIndex(x => x.filename === s.filename) === i
  )

  return (
    <div className="citations">
      <button className="citations-toggle" onClick={() => setOpen(o => !o)}>
        📄 {unique.length} source{unique.length > 1 ? "s" : ""} {open ? "▲" : "▼"}
      </button>
      {open && (
        <ul className="citations-list">
          {sources.map((s, i) => (
            <li key={i} className="citation-item">
              <span className="citation-file">{s.filename}</span>
              {s.page != null && (
                <span className="citation-page">page {s.page}</span>
              )}
              <span className="citation-type">{s.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
