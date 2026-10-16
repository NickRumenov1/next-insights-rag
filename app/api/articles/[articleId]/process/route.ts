import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  ARTICLES_DIR,
  articleKind,
  HttpError,
  textFromBytes,
} from "@/lib/articles";
import { indexForGraph } from "@/lib/rag/graph";
import { indexForVector } from "@/lib/rag/vector";

export type ArticleInput = { articleId: string; name: string; text: string };

export type Chunk = { id: string; articleId: string; index: number; text: string };

export type ProcessResult = {
  articleId: string;
  vector: { chunks: Chunk[] };
  graph: { nodes: number; edges: number };
};

/** Reads a stored article's name and extracted text. Throws HttpError 404/422. */
async function readArticle(id: string): Promise<{ id: string; name: string; text: string }> {
  if (!/^[1-9]\d*$/.test(id)) throw new HttpError("Invalid article id.", 400);

  const directory = path.join(ARTICLES_DIR, id);
  const meta = JSON.parse(await readFile(path.join(directory, "article.json"), "utf8")) as {
    name: string;
  };
  const sourceName = (await readdir(directory)).find((name) => name !== "article.json");
  const kind = sourceName ? articleKind(sourceName) : null;
  if (!sourceName || !kind) throw new HttpError("Article file not found.", 404);

  const text = await textFromBytes(await readFile(path.join(directory, sourceName)), kind);
  if (!text.trim()) throw new HttpError("The article has no text.", 422);
  return { id, name: meta.name, text };
}

async function processArticle(articleId: string): Promise<ProcessResult> {
  const { name, text } = await readArticle(articleId);
  const input = { articleId, name, text };
  const [vector, graph] = await Promise.all([indexForVector(input), indexForGraph(input)]);
  return { articleId, vector, graph };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const { articleId } = await params;
    return Response.json(await processArticle(articleId));
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Could not process that article." }, { status: 500 });
  }
}
