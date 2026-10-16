import type { ArticleInput } from "@/app/api/articles/[articleId]/process/route";
import { MultiDirectedGraph } from "graphology";
import OpenAI from "openai";

const SEED_ENTITY_TYPES = ["company", "startup", "person", "product", "technology", "paper"];
const SEED_PREDICATES = [
  "acquired",
  "merged_with",
  "invested_in",
  "partnered_with",
  "launched",
  "announced",
  "published",
  "appointed",
  "reported",
];

type Fact = {
  subject: string;
  subjectType?: string;
  subjectSector?: string;
  predicate: string;
  object: string;
  objectType?: string;
  objectSector?: string;
  date?: string;
  negated?: boolean;
};

// Held on globalThis so every route shares one graph across Next.js dev reloads.
const globalForGraph = globalThis as unknown as { knowledgeGraph?: MultiDirectedGraph };
export const graph = (globalForGraph.knowledgeGraph ??= new MultiDirectedGraph());

export async function extractFacts(text: string): Promise<Fact[]> {
  const openai = new OpenAI(); // Created lazily so a missing OPENAI_API_KEY doesn't fail at import time.
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract the facts explicitly stated in the article as subject-predicate-object triples.
Reply with JSON: {"facts": [{"subject", "subjectType", "subjectSector", "predicate", "object", "objectType", "objectSector", "date", "negated"}]}.
Rules:
- Use short canonical entity names ("Salesforce.com Inc." -> "Salesforce").
- Prefer entity types from: ${SEED_ENTITY_TYPES.join(", ")}. Add a new lowercase type only if none fits.
- Prefer predicates from: ${SEED_PREDICATES.join(", ")}. Map synonyms to them (bought -> acquired). Add a new lowercase snake_case predicate only if none fits.
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

export async function indexForGraph(input: ArticleInput): Promise<{ nodes: number; edges: number }> {
  const facts = (await extractFacts(input.text)).filter((f) => f.subject && f.object && f.predicate);
  const nodesBefore = graph.order;

  for (const fact of facts) {
    graph.mergeNode(fact.subject, withoutEmpty({ type: fact.subjectType, sector: fact.subjectSector }));
    graph.mergeNode(fact.object, withoutEmpty({ type: fact.objectType, sector: fact.objectSector }));
    graph.addEdge(fact.subject, fact.object, {
      predicate: fact.predicate.trim().toLowerCase().replace(/\s+/g, "_"),
      articleId: input.articleId,
      date: fact.date || undefined,
      negated: fact.negated === true,
    });
  }

  const result = { nodes: graph.order - nodesBefore, edges: facts.length };
  console.log(
    `[graph] indexed article ${input.articleId} "${input.name}": ${result.nodes} new nodes, ${result.edges} edges; graph now holds ${graph.order} nodes, ${graph.size} edges`,
  );
  return result;
}

export function clearGraph() {
  graph.clear();
}

/** mergeNode would overwrite an existing attribute with undefined, so drop unset ones. */
function withoutEmpty(attributes: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(attributes).filter(([, value]) => value));
}
