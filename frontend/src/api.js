import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";

export async function ingestFile(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axios.post(`${BASE}/api/ingest`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function queryDocument(docId, question) {
  const { data } = await axios.post(`${BASE}/api/query`, { docId, question });
  return data;
}
