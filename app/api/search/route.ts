import { bm25Rank, embedChunks, INDEX_FILE, readChunks } from "@/lib/rag/vector";
import type { Chunk } from "@/app/api/articles/[articleId]/process/route";
import { existsSync } from "node:fs";
import { HierarchicalNSW } from "hnswlib-node";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { query } = (await request.json()) as { query?: unknown };
    if (typeof query !== "string" || !query.trim()) {
      return Response.json({ error: "Query is required." }, { status: 400 });
    }

    const chunks = await searchVectors(query);
    return Response.json({ answer: await answerFromChunks(query, chunks) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not search the articles." }, { status: 500 });
  }
}

/** Hybrid search: dense (hnsw) + sparse (BM25), fused with Reciprocal Rank Fusion. */
async function searchVectors(query: string, k = 5): Promise<Chunk[]> {
  const chunks = await readChunks();
  if (chunks.length === 0 || !existsSync(INDEX_FILE)) return [];

  const index = new HierarchicalNSW("cosine", 1536);
  index.readIndexSync(INDEX_FILE);
  const [embedding] = await embedChunks([{ id: "query", articleId: "", index: 0, text: query }]);
  const dense = index.searchKnn(embedding, Math.min(20, index.getCurrentCount())).neighbors;
  const sparse = bm25Rank(query, chunks).slice(0, 20);

  const fused = new Map<number, number>();
  for (const ranking of [dense, sparse]) {
    ranking.forEach((position, rank) => {
      fused.set(position, (fused.get(position) ?? 0) + 1 / (60 + rank + 1));
    });
  }

  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([position]) => chunks[position]);
}

async function answerFromChunks(query: string, chunks: Chunk[]): Promise<string> {
  const openai = new OpenAI();

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Answer the question in one short sentence using only the provided article excerpts. If they do not explicitly state the answer, reply exactly: \"No article states <the answer to the question>.\"",
      },
      {
        role: "user",
        content: `Excerpts:\n${chunks.map((chunk) => `- ${chunk.text}`).join("\n")}\n\nQuestion: ${query}`,
      },
    ],
  });
  return res.choices[0]?.message.content?.trim() ?? "";
}