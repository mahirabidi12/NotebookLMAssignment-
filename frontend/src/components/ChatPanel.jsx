import { useEffect, useRef, useState } from "react";
import { queryDocument } from "../api.js";

export default function ChatPanel({ docId, filename }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    setMessages([]);
  }, [docId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const question = input.trim();
    if (!question || !docId || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const { answer, sources } = await queryDocument(docId, question);
      setMessages((prev) => [...prev, { role: "ai", content: answer, sources }]);
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "ai", content: msg, sources: [] }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-panel">
      <div className="panel-header">
        <span className="panel-icon">💬</span>
        <h2>{filename ? `Chat — ${filename}` : "Chat"}</h2>
      </div>

      <div className="messages">
        {!docId && (
          <div className="empty-state">
            <p>Upload a document on the left to start chatting.</p>
          </div>
        )}

        {docId && messages.length === 0 && (
          <div className="empty-state">
            <p>Ask anything about <strong>{filename}</strong></p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="bubble">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="message ai">
            <div className="bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-row">
        <textarea
          className="chat-input"
          placeholder={docId ? "Ask a question about your document…" : "Upload a document first"}
          value={input}
          disabled={!docId || loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
        />
        <button
          className="send-btn"
          onClick={send}
          disabled={!docId || !input.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
