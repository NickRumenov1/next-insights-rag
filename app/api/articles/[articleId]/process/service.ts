import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ARTICLES_DIR, HttpError, textFromBytes } from "../../service";
import { indexForGraph } from "./graph-process";
import { indexForVector } from "./vector-process";

export async function processArticle(articleId: string): Promise<void> {
  const { text } = await readArticle(articleId);
  await Promise.all([indexForVector(articleId, text), indexForGraph(articleId, text)]);
}

async function readArticle(id: string): Promise<{ id: string; name: string; text: string }> {
  if (!/^[1-9]\d*$/.test(id)) throw new HttpError("Invalid article id.", 400);

  const directory = path.join(ARTICLES_DIR, id);
  const meta = JSON.parse(await readFile(path.join(directory, "article.json"), "utf8")) as {
    name: string;
  };
  const sourceName = (await readdir(directory)).find((name) => name !== "article.json");
  if (!sourceName) throw new HttpError("Article file not found.", 404);

  const text = textFromBytes(await readFile(path.join(directory, sourceName)));
  if (!text.trim()) throw new HttpError("The article has no text.", 422);
  return { id, name: meta.name, text };
}