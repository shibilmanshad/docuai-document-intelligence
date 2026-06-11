import { useState, useRef } from "react"
import DocumentUpload from "./components/DocumentUpload"
import ChatInterface from "./components/ChatInterface"
import DocumentList from "./components/DocumentList"
import "./App.css"

export default function App() {
  const [documents, setDocuments] = useState([])
  const [activeTab, setActiveTab] = useState("chat")
  const refreshDocs = useRef(null)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">AI Document Intelligence</span>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-btn ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              Ask Documents
            </button>
            <button
              className={`nav-btn ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => setActiveTab("upload")}
            >
              Upload
            </button>
            <button
              className={`nav-btn ${activeTab === "docs" ? "active" : ""}`}
              onClick={() => setActiveTab("docs")}
            >
              Library
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {activeTab === "chat" && (
          <ChatInterface />
        )}
        {activeTab === "upload" && (
          <DocumentUpload onUploaded={() => {
            setActiveTab("docs")
          }} />
        )}
        {activeTab === "docs" && (
          <DocumentList ref={refreshDocs} />
        )}
      </main>
    </div>
  )
}
