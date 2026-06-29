import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

/**
 * OpenAI client for embeddings — always calls OpenAI directly.
 *
 * Unlike the Anthropic client (src/lib/llm.ts), embeddings do NOT route through
 * the Neon AI Gateway: the gateway does not offer an OpenAI embeddings model.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

/** Embed a single string → 1536-dim vector. */
export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

/** Embed many strings in one call; result order matches input order. */
export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embedding a search query is identical to embedding event text. */
export const embedQuery = embedText;
