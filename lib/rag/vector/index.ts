import type { ArticleInput, Chunk } from "@/lib/rag/types";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import OpenAI from "openai";

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });

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

  console.log(
    `[vector] indexed article ${input.articleId} "${input.name}": ${chunks.length} chunks, ${embeddings.length} embeddings, ${embeddings[0]?.length ?? 0} dimensions`,
  );

  return { chunks };
}
