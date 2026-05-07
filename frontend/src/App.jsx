import { useState } from "react";
import UploadPanel from "./components/UploadPanel.jsx";
import ChatPanel from "./components/ChatPanel.jsx";

export default function App() {
  const [docId, setDocId] = useState(null);
  const [filename, setFilename] = useState(null);

  function handleDocReady(id, name) {
    setDocId(id);
    setFilename(name);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>NotebookLM</h1>
        <span className="header-sub">RAG-powered document chat</span>
      </header>
      <main className="app-body">
        <UploadPanel onDocReady={handleDocReady} />
        <ChatPanel docId={docId} filename={filename} />
      </main>
    </div>
  );
}
