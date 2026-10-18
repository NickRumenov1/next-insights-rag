import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ARTICLES_DIR, HttpError } from "../service";

export async function createArticles(body: { articles?: { text?: unknown }[] } | null) {
  const items = Array.isArray(body?.articles) ? body.articles : [];
  const texts = items.map((item) => (typeof item?.text === "string" ? item.text : ""));
  if (texts.length === 0 || texts.some((text) => !text.trim())) {
    throw new HttpError("Enter the article text.", 400);
  }

  const articles = [];
  for (const text of texts) articles.push(await createArticle(text));
  return articles;
}

async function createArticle(text: string) {
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
