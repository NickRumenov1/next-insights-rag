import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ARTICLES_DIR, HttpError } from "../service";

export async function createArticle(body: { text?: unknown } | null) {
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) throw new HttpError("Enter the article text.", 400);

  const id = await nextShortId();
  const name = `${id}.txt`;
  const directory = path.join(ARTICLES_DIR, id);

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, name), text, "utf8");
    await writeFile(path.join(directory, "article.json"), JSON.stringify({ id, name }));
    return { id, name, text };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function nextShortId(): Promise<string> {
  let ids: string[] = [];
  try {
    ids = await readdir(ARTICLES_DIR);
  } catch {}

  const numbers = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  return String(numbers.length === 0 ? 1 : Math.max(...numbers) + 1);
}
