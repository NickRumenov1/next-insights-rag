import type { ArticleInput, Chunk } from "@/lib/rag/types";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HierarchicalNSW } from "hnswlib-node";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });

const VECTOR_DIR = path.join(process.cwd(), "data", "vectors");
export const INDEX_FILE = path.join(VECTOR_DIR, "index.dat");
const CHUNKS_FILE = path.join(VECTOR_DIR, "chunks.json"); // position in the array == hnsw label

export async function readChunks(): Promise<Chunk[]> {
  return existsSync(CHUNKS_FILE) ? (JSON.parse(await readFile(CHUNKS_FILE, "utf8")) as Chunk[]) : [];
}

export async function storeEmbeddings(embeddings: number[][], chunks: Chunk[]) {
  await mkdir(VECTOR_DIR, { recursive: true });

  const index = new HierarchicalNSW("cosine", 1536); // text-embedding-3-small
  if (existsSync(INDEX_FILE)) index.readIndexSync(INDEX_FILE);
  else index.initIndex(1000);

  const needed = index.getCurrentCount() + embeddings.length;
  if (needed > index.getMaxElements()) index.resizeIndex(needed * 2);

  for (const embedding of embeddings) index.addPoint(embedding, index.getCurrentCount());

  index.writeIndexSync(INDEX_FILE);
  await writeFile(CHUNKS_FILE, JSON.stringify([...(await readChunks()), ...chunks]));

  console.log(
    `[vector] stored ${embeddings.length} embeddings (${embeddings[0]?.length ?? 0} dims); index now holds ${index.getCurrentCount()}/${index.getMaxElements()}`,
  );
}

export async function embedChunks(chunks: Chunk[]): Promise<number[][]> {
  if (chunks.length === 0) return [];
  const openai = new OpenAI(); // Created lazily so a missing OPENAI_API_KEY doesn't fail at import time.
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks.map((c) => c.text),
  });
  console.log(
    `[vector] embedded successfully: ${res.data.length}/${chunks.length} chunks, model ${res.model}, ${res.usage.total_tokens} tokens`,
  );
  return res.data.map((d) => d.embedding);
}

export async function splitText(articleId: string, text: string): Promise<Chunk[]> {
  const docs = await splitter.createDocuments([text], [{ articleId }]);
  return docs.map((doc, index) => ({
    id: `${articleId}-${index}`,
    articleId,
    index,
    text: doc.pageContent,
  }));
}

export async function indexForVector(input: ArticleInput): Promise<{ chunks: Chunk[] }> {
  const chunks = await splitText(input.articleId, input.text);

  const embeddings = await embedChunks(chunks);
  await storeEmbeddings(embeddings, chunks);

  console.log(
    `[vector] indexed article ${input.articleId} "${input.name}": ${chunks.length} chunks, ${embeddings.length} embeddings stored, ${embeddings[0]?.length ?? 0} dimensions`,
  );

  return { chunks };
}

const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** BM25 (k1 = 1.5, b = 0.75). Returns chunk positions ranked best-first, matches only. */
export function bm25Rank(query: string, chunks: Chunk[]): number[] {
  const docs = chunks.map((chunk) => tokenize(chunk.text));
  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length;
  const terms = new Set(tokenize(query));

  return docs
    .map((doc, position) => {
      let score = 0;
      for (const term of terms) {
        const tf = doc.filter((word) => word === term).length;
        if (!tf) continue;
        const df = docs.filter((other) => other.includes(term)).length;
        const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
        score += (idf * tf * 2.5) / (tf + 1.5 * (0.25 + (0.75 * doc.length) / avgLength));
      }
      return { position, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.position);
}
