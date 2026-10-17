import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HierarchicalNSW } from "hnswlib-node";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { ArticleInput } from "./service";

export type Chunk = { id: string; articleId: string; index: number; text: string };

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });

export const VECTOR_DIR = path.join(process.cwd(), "data", "vectors");
export const INDEX_FILE = path.join(VECTOR_DIR, "index.dat");
const CHUNKS_FILE = path.join(VECTOR_DIR, "chunks.json");

export async function indexForVector(input: ArticleInput): Promise<{ chunks: Chunk[] }> {
  const chunks = await splitText(input.articleId, input.text);

  const embeddings = await embedChunks(chunks);
  await storeEmbeddings(embeddings, chunks);

  return { chunks };
}

export async function readChunks(): Promise<Chunk[]> {
  return existsSync(CHUNKS_FILE) ? (JSON.parse(await readFile(CHUNKS_FILE, "utf8")) as Chunk[]) : [];
}

async function storeEmbeddings(embeddings: number[][], chunks: Chunk[]) {
  await mkdir(VECTOR_DIR, { recursive: true });

  const index = new HierarchicalNSW("cosine", 1536); // text-embedding-3-small
  if (existsSync(INDEX_FILE)) index.readIndexSync(INDEX_FILE);
  else index.initIndex(1000);

  const needed = index.getCurrentCount() + embeddings.length;
  if (needed > index.getMaxElements()) index.resizeIndex(needed * 2);

  for (const embedding of embeddings) index.addPoint(embedding, index.getCurrentCount());

  index.writeIndexSync(INDEX_FILE);
  await writeFile(CHUNKS_FILE, JSON.stringify([...(await readChunks()), ...chunks]));
}

// TODO - This is also embedding on search so need to reflect it in the diagram for the query
export async function embedChunks(chunks: Chunk[]): Promise<number[][]> {
  if (chunks.length === 0) return [];
  const openai = new OpenAI();
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks.map((c) => c.text),
  });
  return res.data.map((d) => d.embedding);
}

async function splitText(articleId: string, text: string): Promise<Chunk[]> {
  const docs = await splitter.createDocuments([text], [{ articleId }]);
  return docs.map((doc, index) => ({
    id: `${articleId}-${index}`,
    articleId,
    index,
    text: doc.pageContent,
  }));
}
