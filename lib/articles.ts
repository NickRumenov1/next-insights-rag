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