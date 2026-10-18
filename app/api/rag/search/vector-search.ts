import { HierarchicalNSW } from "hnswlib-node";
import { existsSync } from "node:fs";
import { getEmbeddingsByChunks, VECTOR_INDEX_FILE, readChunks, type Chunk } from "../process/[articleId]/vector-process";

const DENSE_MAX_DISTANCE = 0.8;

/** Hybrid search: dense (hnsw) + sparse (BM25), fused with Reciprocal Rank Fusion. */
export async function searchVectors(query: string, k = 5): Promise<Chunk[]> {
  const chunks = await readChunks();
  if (chunks.length === 0 || !existsSync(VECTOR_INDEX_FILE)) return [];

  const sparse = bm25Rank(query, chunks).slice(0, 20);

  const vectorIndex = new HierarchicalNSW("cosine", 1536);
  vectorIndex.readIndexSync(VECTOR_INDEX_FILE);
  const queryChunks: Chunk[] = [{ id: "query", articleId: "", index: 0, text: query }];
  const [embedding] = await getEmbeddingsByChunks(queryChunks);
  const { neighbors, distances } = vectorIndex.searchKnn(embedding, Math.min(20, vectorIndex.getCurrentCount()));
  const dense = neighbors.filter((_, rank) => distances[rank] <= DENSE_MAX_DISTANCE);

  return reciprocalRankFusion([dense, sparse], k).map((position) => chunks[position]);
}

const normalize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+(?:[.,](?=\d)[a-z0-9]+)*/g) ?? [];

// Score each chunk using BM25: matching more keywords and rarer keywords generally score higher.
// Example: "Database vector search" ranks above "Database storage" for the query "database vector search".
// Return chunk positions ordered by score, e.g. [1, 0].
function bm25Rank(query: string, chunks: Chunk[]): number[] {
  const docs = chunks.map((chunk) => normalize(chunk.text));
  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length;
  const terms = new Set(normalize(query));

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
 * // Item 1 ranks 2nd and 1st; item 3 ranks 1st and 3rd.
 * // Scores: 1 ≈ 0.0325, 3 ≈ 0.0323, 5 ≈ 0.0161,
 * //         7 ≈ 0.0159, 9 ≈ 0.0156, 2 ≈ 0.0154.
 * reciprocalRankFusion([[3, 1, 7, 9, 2], [1, 5, 3]], 5);
 * // Returns: [1, 3, 5, 7, 9]
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