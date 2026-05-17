import express from "express";
import mongoose from "mongoose";
import { getEmbedding } from "../services/embeddingService.js";
import { getGeminiResponse } from "../services/geminiService.js";
import { generateHypothetical } from "../services/hydeService.js";
import Chunk from "../models/Chunk.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { docId, question } = req.body;
    if (!docId || !question) {
      return res.status(400).json({ error: "docId and question are required" });
    }

    // 1. HyDE — generate a hypothetical passage, embed it as "passage" for better retrieval
    const hypothetical = await generateHypothetical(question);
    const queryVector = await getEmbedding(hypothetical, "passage");

    // 2. Vector search — top 5 chunks from this document
    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 20,
          limit: 5,
          filter: { docId },
        },
      },
      {
        $project: {
          _id: 0,
          text: 1,
          pageNumber: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    if (results.length === 0) {
      return res.json({
        answer: "I couldn't find relevant content in the document to answer your question.",
        sources: [],
      });
    }

    // 3. Build context string
    const context = results
      .map((r, i) => `[Chunk ${i + 1} — Page ${r.pageNumber}]\n${r.text}`)
      .join("\n\n---\n\n");

    // 4. Gemini prompt — grounded strictly in context
    const prompt = `You are a document assistant. Answer the user's question using ONLY the context extracted from their uploaded document. Do not use outside knowledge.

If the context does not contain enough information to answer, say: "The document doesn't seem to cover this topic."

Context:
${context}

User question: ${question}`;

    const answer = await getGeminiResponse(prompt);

    const sources = results.map((r) => ({ pageNumber: r.pageNumber, excerpt: r.text.slice(0, 120) + "…" }));

    res.json({ answer, sources });
  } catch (err) {
    console.error("Query error:", err);
    if (err.message === "GEMINI_MODEL_OVERLOADED") {
      return res.status(503).json({ error: "AI model is temporarily overloaded. Please try again." });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
