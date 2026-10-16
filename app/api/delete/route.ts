import { rm } from "node:fs/promises";
import { ARTICLES_DIR } from "@/lib/articles";
import { clearGraph } from "@/lib/rag/graph";
import { VECTOR_DIR } from "@/lib/rag/vector";

export async function DELETE() {
  try {
    await rm(ARTICLES_DIR, { recursive: true, force: true });
    await rm(VECTOR_DIR, { recursive: true, force: true }); // chunks/embeddings of the deleted articles
    clearGraph();
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not delete the articles." }, { status: 500 });
  }
}
