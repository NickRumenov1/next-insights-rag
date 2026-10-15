import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import {
  ARTICLES_DIR,
  articleKind,
  HttpError as UploadError,
  isMissing,
  textFromBytes,
} from "@/lib/articles";

type StoredArticle = {
  id: string;
  name: string;
  text: string;
};

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

async function createArticleLocation(originalName: string): Promise<{
  id: string;
  name: string;
  filePath: string;
}> {
  const id = await nextShortId();
  const name = path.win32.basename(path.posix.basename(originalName)).trim() || "article";

  return {
    id,
    name,
    filePath: path.join(ARTICLES_DIR, id, sanitizeFilename(name)),
  };
}

async function listArticles(): Promise<StoredArticle[]> {

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


function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/[\u0000-\u001f]/g, "").replace(/[/\\]/g, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return "article";
  return cleaned.slice(0, 180);
}