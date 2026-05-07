import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { parsePDF, parseTXT } from "../services/pdfParser.js";
import { chunkText } from "../services/chunker.js";
import { batchEmbed } from "../services/embeddingService.js";
import Chunk from "../models/Chunk.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const isPDF = file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf");
    const isTXT = file.mimetype === "text/plain" || file.originalname.endsWith(".txt");

    if (!isPDF && !isTXT) {
      return res.status(400).json({ error: "Only PDF and TXT files are supported" });
    }

    // 1. Parse → pages
    const pages = isPDF ? await parsePDF(file.buffer) : parseTXT(file.buffer);

    // 2. Chunk each page, track page number per chunk
    const rawChunks = [];
    for (const { pageNumber, text } of pages) {
      const chunks = chunkText(text);
      for (const chunk of chunks) {
        rawChunks.push({ text: chunk, pageNumber });
      }
    }

    if (rawChunks.length === 0) {
      return res.status(422).json({ error: "No text could be extracted from the file" });
    }

    // 3. Embed all chunks (batched)
    const texts = rawChunks.map((c) => c.text);
    const embeddings = await batchEmbed(texts, "passage");

    // 4. Save to MongoDB
    const docId = uuidv4();
    const docs = rawChunks.map((chunk, i) => ({
      docId,
      filename: file.originalname,
      text: chunk.text,
      embedding: embeddings[i],
      pageNumber: chunk.pageNumber,
      chunkIndex: i,
    }));

    await Chunk.insertMany(docs);

    res.json({ docId, filename: file.originalname, chunkCount: docs.length });
  } catch (err) {
    console.error("Ingest error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
