import { HierarchicalNSW } from "hnswlib-node";
import { existsSync } from "node:fs";
import { getEmbeddingsByChunks, INDEX_FILE, readChunks, type Chunk } from "../articles/[articleId]/process/vector-process";

/** Cosine distance above which a dense hit counts as unrelated (kNN always returns neighbours, however far). */
const MAX_DISTANCE = 0.8;

/** Hybrid search: dense (hnsw) + sparse (BM25), fused with Reciprocal Rank Fusion. */
export async function searchVectors(query: string, k = 5): Promise<Chunk[]> {
  const chunks = await readChunks();
  if (chunks.length === 0 || !existsSync(INDEX_FILE)) return [];

  const index = new HierarchicalNSW("cosine", 1536);
  index.readIndexSync(INDEX_FILE);
  const [embedding] = await getEmbeddingsByChunks([{ id: "query", articleId: "", index: 0, text: query }]);
  const { neighbors, distances } = index.searchKnn(embedding, Math.min(20, index.getCurrentCount()));
  const dense = neighbors.filter((_, rank) => distances[rank] <= MAX_DISTANCE);
  const sparse = bm25Rank(query, chunks).slice(0, 20);

  return reciprocalRankFusion([dense, sparse], k).map((position) => chunks[position]);
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

/**
 * Reciprocal Rank Fusion: merges several best-first rankings into one.
 * Each item scores the sum of 1 / (60 + rank) over every ranking it appears in (rank starts at 1),
 * so items ranked high in several lists win, and raw scores of different retrievers never need comparing.
 *
 * @param rankings Lists of item ids (here: chunk positions), each ordered best-first.
 * @param k How many fused ids to return.
 * @returns Up to `k` ids ordered by fused score, best-first.
 *
 * @example
 * // Item A is 2nd in the first list and 1st in the second; Item B is 1st and 3rd.
 * // 1 -> 1/62 + 1/61 ≈ 0.0325, 3 -> 1/61 + 1/63 ≈ 0.0323, 5 -> 1/62 ≈ 0.0161, 7 -> 1/63 ≈ 0.0159
 * reciprocalRankFusion([[3, 1, 7], [1, 5, 3]], 3); // [1, 3, 5]
 *
 * @example
 * // An item present in only one list can still win if nothing else beats it.
 * reciprocalRankFusion([[4, 2], []], 1); // [4]
 */
function reciprocalRankFusion(rankings: number[][], k: number): number[] {
  const fused = new Map<number, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, rank) => {
      fused.set(id, (fused.get(id) ?? 0) + 1 / (60 + rank + 1));
    });
  }

  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id]) => id);
}