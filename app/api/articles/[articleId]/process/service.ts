import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ARTICLES_DIR, articleKind, HttpError, textFromBytes } from "../../service";
import { indexForGraph } from "./graph-process";
import { indexForVector, type Chunk } from "./vector-process";

export type ArticleInput = { articleId: string; name: string; text: string };

export type ProcessResult = {
  articleId: string;
  vector: { chunks: Chunk[] };
  graph: { nodes: number; edges: number };
};

export async function processArticle(articleId: string): Promise<ProcessResult> {
  const { name, text } = await readArticle(articleId);
  const input = { articleId, name, text };
  const [vector, graph] = await Promise.all([indexForVector(input), indexForGraph(input)]);
  console.log('new vector chunks: ', vector);
  console.log('new processed graph nodes: ', graph)
  return { articleId, vector, graph };
}

async function readArticle(id: string): Promise<{ id: string; name: string; text: string }> {
  if (!/^[1-9]\d*$/.test(id)) throw new HttpError("Invalid article id.", 400);

  const directory = path.join(ARTICLES_DIR, id);
  const meta = JSON.parse(await readFile(path.join(directory, "article.json"), "utf8")) as {
    name: string;
  };
  const sourceName = (await readdir(directory)).find((name) => name !== "article.json");
  const kind = sourceName ? articleKind(sourceName) : null;
  if (!sourceName || !kind) throw new HttpError("Article file not found.", 404);

  const text = textFromBytes(await readFile(path.join(directory, sourceName)));
  if (!text.trim()) throw new HttpError("The article has no text.", 422);
  return { id, name: meta.name, text };
}