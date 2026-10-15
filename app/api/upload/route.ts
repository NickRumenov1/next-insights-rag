import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { extractText } from "unpdf";

type ArticleKind = "txt" | "pdf";

type StoredArticle = {
  id: string;
  name: string;
  text: string;
};

class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const ARTICLES_DIR = path.join(process.cwd(), "data", "articles");

export async function GET() {
  await connection();
  return Response.json({ articles: await listArticles() });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new UploadError("Choose a .txt or .pdf file.", 400);
    }

    const kind = articleKind(file.name);
    if (!kind) {
      throw new UploadError("Only .txt and .pdf files are supported.", 415);
    }
    if (file.size === 0) {
      throw new UploadError("The file is empty.", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const location = await createArticleLocation(file.name);

    try {
      await mkdir(path.dirname(location.filePath), { recursive: true });
      await writeFile(location.filePath, bytes);
      const text = await textFromBytes(bytes, kind);
      await writeFile(
        path.join(ARTICLES_DIR, location.id, "article.json"),
        JSON.stringify({ id: location.id, name: location.name }),
      );
      console.log("Uploaded article text: ", text);
      return Response.json({
        text,
        article: { id: location.id, name: location.name, text },
      });
    } catch (error) {
      await rm(path.join(ARTICLES_DIR, location.id), { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Could not read that file." }, { status: 500 });
  }
}

function articleKind(filename: string): ArticleKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".pdf")) return "pdf";
  return null;
}

async function textFromBytes(bytes: Buffer, kind: ArticleKind): Promise<string> {
  if (kind === "txt") return bytes.toString("utf8").replace(/^\uFEFF/, "");

  if (!bytes.subarray(0, 5).toString("utf8").startsWith("%PDF-")) {
    throw new UploadError("That PDF could not be read.", 422);
  }

  try {
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    return text;
  } catch {
    throw new UploadError("That PDF could not be read.", 422);
  }
}

async function createArticleLocation(originalName: string): Promise<{
  id: string;
  name: string;
  filePath: string;
}> {
  await migrateLegacyIds();
  const id = await nextShortId();
  const name = originalFilename(originalName);
  return {
    id,
    name,
    filePath: path.join(ARTICLES_DIR, id, sanitizeFilename(name)),
  };
}

async function listArticles(): Promise<StoredArticle[]> {
  await migrateLegacyIds();

  let ids: string[];
  try {
    ids = await readdir(ARTICLES_DIR);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
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
        if (isMissing(error)) return null;
        throw error;
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

async function nextShortId(): Promise<string> {
  let ids: string[] = [];
  try {
    ids = await readdir(ARTICLES_DIR);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  const numbers = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
  return String(next);
}

async function migrateLegacyIds(): Promise<void> {
  let ids: string[];
  try {
    ids = await readdir(ARTICLES_DIR);
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }

  const legacy: { id: string; mtime: number }[] = [];
  for (const id of ids) {
    if (/^\d+$/.test(id)) continue;
    const metaPath = path.join(ARTICLES_DIR, id, "article.json");
    try {
      const info = await stat(metaPath);
      legacy.push({ id, mtime: info.mtimeMs });
    } catch (error) {
      if (isMissing(error)) continue;
      throw error;
    }
  }

  legacy.sort((left, right) => left.mtime - right.mtime);

  for (const entry of legacy) {
    const nextId = await nextShortId();
    const destination = path.join(ARTICLES_DIR, nextId);
    await rename(path.join(ARTICLES_DIR, entry.id), destination);
    const metaPath = path.join(destination, "article.json");
    const meta = JSON.parse(await readFile(metaPath, "utf8")) as { id: string; name: string };
    await writeFile(metaPath, JSON.stringify({ ...meta, id: nextId }));
  }
}

function originalFilename(filename: string): string {
  const name = path.win32.basename(path.posix.basename(filename)).trim();
  return name || "article";
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/[\u0000-\u001f]/g, "").replace(/[/\\]/g, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return "article";
  return cleaned.slice(0, 180);
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
