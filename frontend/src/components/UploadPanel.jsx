import { useRef, useState } from "react";
import { ingestFile } from "../api.js";

export default function UploadPanel({ onDocReady }) {
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [info, setInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setInfo(null);
    try {
      const result = await ingestFile(file, setProgress);
      setInfo(result);
      setStatus("done");
      onDocReady(result.docId, result.filename);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  function onInputChange(e) {
    handleFile(e.target.files[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="upload-panel">
      <div className="panel-header">
        <span className="panel-icon">📄</span>
        <h2>Document</h2>
      </div>

      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""} ${status === "done" ? "done" : ""}`}
        onClick={() => status !== "uploading" && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.csv"
          style={{ display: "none" }}
          onChange={onInputChange}
        />

        {status === "idle" && (
          <>
            <span className="drop-icon">☁️</span>
            <p className="drop-title">Drop your file here</p>
            <p className="drop-sub">PDF, TXT, or CSV — click to browse</p>
          </>
        )}

        {status === "uploading" && (
          <>
            <span className="drop-icon spin">⚙️</span>
            <p className="drop-title">Processing…</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="drop-sub">{progress}% uploaded</p>
          </>
        )}

        {status === "done" && info && (
          <>
            <span className="drop-icon">✅</span>
            <p className="drop-title">{info.filename}</p>
            <p className="drop-sub">{info.chunkCount} chunks indexed</p>
            <button
              className="new-doc-btn"
              onClick={(e) => {
                e.stopPropagation();
                setStatus("idle");
                setInfo(null);
                onDocReady(null, null);
              }}
            >
              Upload new document
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <span className="drop-icon">❌</span>
            <p className="drop-title">Upload failed</p>
            <p className="drop-sub">Check console for details</p>
            <button
              className="new-doc-btn"
              onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
