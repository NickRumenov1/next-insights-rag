import { rm } from "node:fs/promises";
import { ARTICLES_DIR } from "../articles/service";
import { graph } from "../articles/[articleId]/process/graph-process";
import { VECTOR_DIR } from "../articles/[articleId]/process/vector-process";

export async function deleteAll() {
  await rm(ARTICLES_DIR, { recursive: true, force: true });
  await rm(VECTOR_DIR, { recursive: true, force: true }); // chunks/embeddings of the deleted articles
  graph.clear();
}
