import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { extractText } from "unpdf";

export type ArticleKind = "txt" | "pdf";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const ARTICLES_DIR = path.join(process.cwd(), "data", "articles");

export function articleKind(filename: string): ArticleKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".pdf")) return "pdf";
  return null;
}

export async function textFromBytes(bytes: Buffer, kind: ArticleKind): Promise<string> {
  if (kind === "txt") return bytes.toString("utf8").replace(/^\uFEFF/, "");

  if (!bytes.subarray(0, 5).toString("utf8").startsWith("%PDF-")) {
    throw new HttpError("That PDF could not be read.", 422);
  }

  try {
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    return text;
  } catch {
    throw new HttpError("That PDF could not be read.", 422);
  }
}

type StoredArticle = {
  id: string;
  name: string;
  text: string;
};

export async function listArticles(): Promise<StoredArticle[]> {
  let ids: string[];
  try {
    ids = await readdir(ARTICLES_DIR);
  } catch (error) {
    console.error(error);
    return [];
  }

  const articles = await Promise.all(
    ids.map(async (id) => {
      try {
        const directory = path.join(ARTICLES_DIR, id);
        const metaPath = path.join(directory, "article.json");
        const meta = JSON.parse(await readFile(metaPath, "utf8")) as {
          id: string;
          name: string;
        };
        const info = await stat(metaPath);
        const names = await readdir(directory);
        const sourceName = names.find((name) => name !== "article.json");
        const text = sourceName ? await readStoredText(path.join(directory, sourceName)) : "";
        return { id: meta.id, name: meta.name, text, mtime: info.mtimeMs };
      } catch (error) {
        console.error(error);
        return null;
      }
    }),
  );

  return articles
    .filter((article): article is StoredArticle & { mtime: number } => article !== null)
    .sort((left, right) => left.mtime - right.mtime)
    .map(({ id, name, text }) => ({ id, name, text }));
}

async function readStoredText(filePath: string): Promise<string> {
  const kind = articleKind(filePath);
  if (!kind) return "";
  try {
    return await textFromBytes(await readFile(filePath), kind);
  } catch {
    return "";
  }
}
