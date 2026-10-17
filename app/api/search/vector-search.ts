import { HierarchicalNSW } from "hnswlib-node";
import { existsSync } from "node:fs";
import { embedChunks, INDEX_FILE, readChunks, type Chunk } from "../articles/[articleId]/process/service";

/** Hybrid search: dense (hnsw) + sparse (BM25), fused with Reciprocal Rank Fusion. */
export async function searchVectors(query: string, k = 5): Promise<Chunk[]> {
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

const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** BM25 (k1 = 1.5, b = 0.75). Returns chunk positions ranked best-first, matches only. */
function bm25Rank(query: string, chunks: Chunk[]): number[] {
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
