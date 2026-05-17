import { getGeminiResponse } from "./geminiService.js";

export async function generateHypothetical(question) {
  const prompt = `Write a short, factual passage (2-4 sentences) that directly answers this question. Write it as if it were an excerpt from a document — no preamble, no explanation, just the passage itself.

Question: ${question}`;

  return getGeminiResponse(prompt);
}
