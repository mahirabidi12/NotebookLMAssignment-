import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({});

export async function getGeminiResponse(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    if (error.status === 503) {
      throw new Error("GEMINI_MODEL_OVERLOADED");
    }
    throw new Error("Failed to generate content from Gemini");
  }
}
