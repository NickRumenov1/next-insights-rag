import { readdir, readFile } from "node:fs/promises";
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

export function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

/** Reads a stored article's name and extracted text. Throws HttpError 404/422. */
export async function readArticle(id: string): Promise<{ id: string; name: string; text: string }> {
  if (!/^[1-9]\d*$/.test(id)) throw new HttpError("Invalid article id.", 400);

  const directory = path.join(ARTICLES_DIR, id);
  try {
    const meta = JSON.parse(await readFile(path.join(directory, "article.json"), "utf8")) as {
      name: string;
    };
    const sourceName = (await readdir(directory)).find((name) => name !== "article.json");
    const kind = sourceName ? articleKind(sourceName) : null;
    if (!sourceName || !kind) throw new HttpError("Article file not found.", 404);

    const text = await textFromBytes(await readFile(path.join(directory, sourceName)), kind);
    if (!text.trim()) throw new HttpError("The article has no text.", 422);
    return { id, name: meta.name, text };
  } catch (error) {
    if (isMissing(error)) throw new HttpError("Article not found.", 404);
    throw error;
  }
}
