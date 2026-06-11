import { useState, useRef, useEffect } from "react"
import DashboardWidget from "./DashboardWidget"
import WorkflowWidget from "./WorkflowWidget"
import TableWidget from "./TableWidget"
import SourceCitations from "./SourceCitations"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const SUGGESTED_QUESTIONS = [
  "Give me a dashboard of key metrics from the reports",
  "Show the approval workflow as a diagram",
  "What are the main findings?",
  "Extract the financial data as a table",
]

export default function ChatInterface() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(question) {
    const q = question || input.trim()
    if (!q) return

    setInput("")
    setMessages(prev => [...prev, { role: "user", content: q }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, session_id: sessionId }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", ...data }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", intent: "qa", answer: "Could not connect to the server. Make sure the backend is running." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-layout">
      {/* ── Message list ── */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="empty-headline">Ask anything about your documents</p>
            <p className="empty-sub">
              Upload files first, then ask questions. DocuAI will answer, generate dashboards,
              extract tables, or draw workflow diagrams — automatically.
            </p>
            <div className="suggestions">
              {SUGGESTED_QUESTIONS.map(q => (
                <button key={q} className="suggestion-btn" onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            {msg.role === "user" ? (
              <div className="bubble user-bubble">{msg.content}</div>
            ) : (
              <div className="assistant-message">
                {/* Intent badge */}
                {msg.intent && msg.intent !== "qa" && (
                  <span className={`intent-badge intent-${msg.intent}`}>
                    {msg.intent}
                  </span>
                )}

                {/* Generative UI: route to the right widget */}
                {msg.intent === "dashboard" && msg.data && (
                  <DashboardWidget data={msg.data} />
                )}
                {msg.intent === "workflow" && msg.data && (
                  <WorkflowWidget data={msg.data} />
                )}
                {msg.intent === "table" && msg.data && (
                  <TableWidget data={msg.data} />
                )}
                {msg.answer && (
                  <div className="answer-text">{msg.answer}</div>
                )}

                {/* Source citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <SourceCitations sources={msg.sources} />
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message message-assistant">
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="chat-input-bar">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask a question about your documents…"
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
