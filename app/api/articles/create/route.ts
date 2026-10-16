import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ARTICLES_DIR, HttpError } from "@/lib/articles";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { title?: unknown; text?: unknown } | null;
    const title = typeof body?.title === "string" ? body.title : "";
    const text = typeof body?.text === "string" ? body.text : "";

    const cleanTitle = title
      .replace(/[\u0000-\u001f/\\]/g, "")
      .replace(/\.txt$/i, "")
      .trim()
      .slice(0, 170);
    if (!cleanTitle || cleanTitle === "." || cleanTitle === "..") {
      throw new HttpError("Enter a title.", 400);
    }
    if (!text.trim()) throw new HttpError("Enter the article text.", 400);

    const name = `${cleanTitle}.txt`;
    const id = await nextShortId();
    const directory = path.join(ARTICLES_DIR, id);

    try {
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, name), text, "utf8");
      await writeFile(path.join(directory, "article.json"), JSON.stringify({ id, name }));
      return Response.json({ article: { id, name, text } });
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Could not save the article." }, { status: 500 });
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
