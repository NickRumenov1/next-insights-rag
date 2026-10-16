import { graph } from "@/lib/rag/graph";
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

    const [chunks, entities] = await Promise.all([searchVectors(query), matchEntities(query)]);
    console.log(`[graph] matched entities for "${query}": ${JSON.stringify(entities)}`);
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

/** Maps the named entities a question mentions onto existing graph node ids. */
async function matchEntities(query: string): Promise<string[]> {
  if (graph.order === 0) return [];

  const names = await extractQueryNames(query);
  if (names.length === 0) return [];

  const entities = await mapNamesToNodes(names);
  return [...new Set(entities)].filter((name) => graph.hasNode(name));
}

/** GPT step 1: names alone, so the node list can't pull in entities the question never wrote. */
async function extractQueryNames(query: string): Promise<string[]> {
  const { names = [] } = await promptForJson(
    `List the proper names of companies, people, products, technologies and papers written in the question, exactly as spelled. Skip generic words ("company", "who", "AI startups"). Reply with JSON: {"names": []}. Example: "Who acquired Salesforce?" -> {"names": ["Salesforce"]}.`,
    query,
  );
  return names;
}

/** GPT step 2: maps each extracted name to an existing graph node. */
async function mapNamesToNodes(names: string[]): Promise<string[]> {
  const { entities = [] } = await promptForJson(
    `Map each given name to a graph node. Match the same entity only: an alias, a legal suffix, or a typo of that exact name ("Slak" -> "Slack"). A different real word is not a match ("Stack" is not "Slack"). Skip names with no node. Reply with JSON: {"entities": ["<exact node name>"]}.`,
    `Nodes:\n${graph.nodes().join("\n")}\n\nNames: ${JSON.stringify(names)}`,
  );
  return entities;
}

async function promptForJson(system: string, user: string) {
  const openai = new OpenAI();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(res.choices[0]?.message.content ?? "{}") as Record<string, string[]>;
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