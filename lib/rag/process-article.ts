import { readArticle } from "@/lib/articles";
import { indexForGraph } from "@/lib/rag/graph";
import type { ProcessResult } from "@/lib/rag/types";
import { indexForVector } from "@/lib/rag/vector";

export async function processArticle(articleId: string): Promise<ProcessResult> {
  const { name, text } = await readArticle(articleId);
  const input = { articleId, name, text };

  const [vector, graph] = await Promise.all([indexForVector(input), indexForGraph(input)]);
  return { articleId, vector, graph };
}
