import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MultiDirectedGraph } from "graphology";
import { HierarchicalNSW } from "hnswlib-node";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { ARTICLES_DIR, articleKind, HttpError, textFromBytes } from "../../service";

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

export async function processArticle(articleId: string): Promise<ProcessResult> {
  const { name, text } = await readArticle(articleId);
  const input = { articleId, name, text };
  const [vector, graph] = await Promise.all([indexForVector(input), indexForGraph(input)]);
  return { articleId, vector, graph };
}

// ---------------------------------------------------------------------------
// Vector index
// ---------------------------------------------------------------------------

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });

export const VECTOR_DIR = path.join(process.cwd(), "data", "vectors");
export const INDEX_FILE = path.join(VECTOR_DIR, "index.dat");
const CHUNKS_FILE = path.join(VECTOR_DIR, "chunks.json"); // position in the array == hnsw label

export async function readChunks(): Promise<Chunk[]> {
  return existsSync(CHUNKS_FILE) ? (JSON.parse(await readFile(CHUNKS_FILE, "utf8")) as Chunk[]) : [];
}

async function storeEmbeddings(embeddings: number[][], chunks: Chunk[]) {
  await mkdir(VECTOR_DIR, { recursive: true });

  const index = new HierarchicalNSW("cosine", 1536); // text-embedding-3-small
  if (existsSync(INDEX_FILE)) index.readIndexSync(INDEX_FILE);
  else index.initIndex(1000);

  const needed = index.getCurrentCount() + embeddings.length;
  if (needed > index.getMaxElements()) index.resizeIndex(needed * 2);

  for (const embedding of embeddings) index.addPoint(embedding, index.getCurrentCount());

  index.writeIndexSync(INDEX_FILE);
  await writeFile(CHUNKS_FILE, JSON.stringify([...(await readChunks()), ...chunks]));

  console.log(
    `[vector] stored ${embeddings.length} embeddings (${embeddings[0]?.length ?? 0} dims); index now holds ${index.getCurrentCount()}/${index.getMaxElements()}`,
  );
}

export async function embedChunks(chunks: Chunk[]): Promise<number[][]> {
  if (chunks.length === 0) return [];
  const openai = new OpenAI(); // Created lazily so a missing OPENAI_API_KEY doesn't fail at import time.
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks.map((c) => c.text),
  });
  console.log(
    `[vector] embedded successfully: ${res.data.length}/${chunks.length} chunks, model ${res.model}, ${res.usage.total_tokens} tokens`,
  );
  return res.data.map((d) => d.embedding);
}

async function splitText(articleId: string, text: string): Promise<Chunk[]> {
  const docs = await splitter.createDocuments([text], [{ articleId }]);
  return docs.map((doc, index) => ({
    id: `${articleId}-${index}`,
    articleId,
    index,
    text: doc.pageContent,
  }));
}

async function indexForVector(input: ArticleInput): Promise<{ chunks: Chunk[] }> {
  const chunks = await splitText(input.articleId, input.text);

  const embeddings = await embedChunks(chunks);
  await storeEmbeddings(embeddings, chunks);

  console.log(
    `[vector] indexed article ${input.articleId} "${input.name}": ${chunks.length} chunks, ${embeddings.length} embeddings stored, ${embeddings[0]?.length ?? 0} dimensions`,
  );

  return { chunks };
}

// ---------------------------------------------------------------------------
// Knowledge graph
// ---------------------------------------------------------------------------

// Generic fallback so the first articles have something to reuse; the graph's own terms take over as it grows.
const SEED_ENTITY_TYPES = ["organization", "person", "product", "technology", "location", "event"];
const SEED_PREDICATES = [
  "acquired",
  "invested_in",
  "partnered_with",
  "launched",
  "announced",
  "appointed",
  "reported",
];
const VOCABULARY_SIZE = 100;

type Fact = {
  subject: string;
  subjectType?: string;
  subjectSector?: string;
  predicate: string;
  object?: string;
  objectType?: string;
  objectSector?: string;
  metric?: string;
  value?: string;
  unit?: string;
  period?: string;
  date?: string;
  negated?: boolean;
};

// Held on globalThis so every route shares one graph across Next.js dev reloads.
const globalForGraph = globalThis as unknown as { knowledgeGraph?: MultiDirectedGraph };
export const graph = (globalForGraph.knowledgeGraph ??= new MultiDirectedGraph());

const normalizeTerm = (term: string) => term.trim().toLowerCase().replace(/\s+/g, "_");

/** Entity types and predicates already in the graph (most used first), topped up with the generic seeds. */
export function vocabulary() {
  const count = (values: unknown[], seeds: string[]) => {
    const counts = new Map<string, number>();
    for (const value of values) {
      if (typeof value === "string") counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const learned = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([term]) => term);
    return [...new Set([...learned, ...seeds])].slice(0, VOCABULARY_SIZE);
  };

  return {
    entityTypes: count(graph.mapNodes((_, attributes) => attributes.type), SEED_ENTITY_TYPES),
    predicates: count(graph.mapEdges((_, attributes) => attributes.predicate), SEED_PREDICATES)
  };
}

async function extractFacts(text: string): Promise<Fact[]> {
  const openai = new OpenAI(); // Created lazily so a missing OPENAI_API_KEY doesn't fail at import time.
  const { entityTypes, predicates } = vocabulary();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract the facts explicitly stated in the article (tech news, financial report or press release) as subject-predicate-object triples.
Reply with JSON: {"facts": [{"subject", "subjectType", "subjectSector", "predicate", "object", "objectType", "objectSector", "metric", "value", "unit", "period", "date", "negated"}]}.
Rules:
- Use short canonical entity names ("Salesforce.com Inc." -> "Salesforce").
- Entity types in use: ${entityTypes.join(", ")}. Reuse one whenever it fits; add a new lowercase snake_case type only if none does.
- Predicates in use: ${predicates.join(", ")}. Reuse one whenever it has the same meaning (bought -> acquired); add a new lowercase snake_case predicate only if none does.
- A measured figure has no object entity: leave "object" out and set "metric" ("revenue", "eps"), "value" (as written, "12.3"), "unit" ("USD billion") and "period" ("Q3 2026"). Example: "Acme reported revenue of $12.3B in Q3 2026" -> predicate "reported", metric "revenue".
- "subjectSector"/"objectSector" are optional free-form industries such as "database" or "AI".
- "date" is optional, exactly as stated in the article.
- "negated" is true when the article says the fact did not happen ("never acquired", "did not acquire").
- Skip speculation, hopes and hypotheticals ("might acquire someday").`,
      },
      { role: "user", content: text },
    ],
  });
  const parsed = JSON.parse(res.choices[0]?.message.content ?? "{}") as { facts?: Fact[] };
  return parsed.facts ?? [];
}

async function indexForGraph(input: ArticleInput): Promise<{ nodes: number; edges: number }> {
  const facts = (await extractFacts(input.text)).filter((f) => f.subject && f.predicate && (f.object || f.value));
  const nodesBefore = graph.order;

  for (const fact of facts) {
    graph.mergeNode(fact.subject, withoutEmpty({ type: fact.subjectType && normalizeTerm(fact.subjectType), sector: fact.subjectSector }));
    if (fact.object) {
      graph.mergeNode(fact.object, withoutEmpty({ type: fact.objectType && normalizeTerm(fact.objectType), sector: fact.objectSector }));
    }
    // A measured figure has no object entity, so it becomes a self-loop on the subject.
    graph.addEdge(fact.subject, fact.object || fact.subject, {
      predicate: normalizeTerm(fact.predicate),
      articleId: input.articleId,
      date: fact.date || undefined,
      negated: fact.negated === true,
      ...withoutEmpty({ metric: fact.metric, value: fact.value, unit: fact.unit, period: fact.period }),
    });
  }

  return { nodes: graph.order - nodesBefore, edges: facts.length };
}

/** mergeNode would overwrite an existing attribute with undefined, so drop unset ones. */
function withoutEmpty(attributes: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(attributes).filter(([, value]) => value));
}
