import "dotenv/config";

export async function getEmbedding(text, inputType = "passage") {
  const { NVIDIA_API_KEY, NVIDIA_API_URL } = process.env;

  if (!NVIDIA_API_KEY || !NVIDIA_API_URL) {
    throw new Error("NVIDIA_API_KEY and NVIDIA_API_URL must be set in .env");
  }

  const texts = Array.isArray(text) ? text : [text];

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: "nvidia/nv-embedqa-e5-v5",
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`NVIDIA API Error: ${err.detail || response.statusText}`);
  }

  const result = await response.json();
  const embeddings = result.data.map((item) => item.embedding);
  return Array.isArray(text) ? embeddings : embeddings[0];
}

// Embed in batches to avoid rate limits
export async function batchEmbed(texts, inputType = "passage", batchSize = 10) {
  const all = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await getEmbedding(batch, inputType);
    all.push(...embeddings);
  }
  return all;
}
