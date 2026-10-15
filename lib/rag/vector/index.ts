import type { ArticleInput, Chunk } from "@/lib/rag/types";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });

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

  console.log(`[vector] article ${input.articleId} "${input.name}": ${chunks.length} chunks`);
  for (const chunk of chunks) {
    console.log(`[vector] chunk ${chunk.id} (${chunk.text.length} chars): ${chunk.text} `);
  }

  return { chunks };
}
