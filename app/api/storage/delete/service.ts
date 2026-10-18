import { rm } from "node:fs/promises";
import { ARTICLES_DIR } from "../articles/service";
import { graph } from "../../rag/process/[articleId]/graph-process";
import { VECTOR_DIR } from "../../rag/process/[articleId]/vector-process";

export async function deleteAll() {
  await rm(ARTICLES_DIR, { recursive: true, force: true });
  await rm(VECTOR_DIR, { recursive: true, force: true }); // chunks/embeddings of the deleted articles
  graph.clear();
}
