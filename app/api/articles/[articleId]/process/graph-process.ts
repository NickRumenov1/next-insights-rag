import { MultiDirectedGraph } from "graphology";
import OpenAI from "openai";
import type { ArticleInput } from "./service";

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

/**
 * Extracts subject-predicate-object facts from an article with the LLM and adds them to the shared in-memory graph.
 * - Each entity is a node keyed by its name (existing nodes are reused and their attributes merged).
 * - Each fact is a new edge `subject -[predicate]-> object`, tagged with the source `articleId`.
 *
 * @param input The article id and its text.
 * @returns `nodes`: how many new nodes this article created; `edges`: how many edges (facts) it added.
 *
 * @example
 * // Article "a1": "Acme acquired Beta in March 2026. Acme reported revenue of $12.3B in Q3 2026."
 * await indexForGraph({ articleId: "a1", text }); // { nodes: 2, edges: 2 }
 *
 * // Resulting graph:
 * //
 * // nodes
 * //   "Acme" { type: "organization" }
 * //   "Beta" { type: "organization" }
 * //
 * // edges
 * //   "Acme" -> "Beta"
 * //     { predicate: "acquired", articleId: "a1", date: "March 2026", negated: false }
 * //   "Acme" -> "Acme"   (self-loop, measured figure)
 * //     { predicate: "reported", articleId: "a1", negated: false,
 * //       metric: "revenue", value: "12.3", unit: "USD billion", period: "Q3 2026" }
 */
export async function indexForGraph(input: ArticleInput): Promise<{ nodes: number; edges: number }> {
  const facts = (await extractFacts(input.text)).filter((f) => f.subject && f.predicate && (f.object || f.value));
  const nodesBefore = graph.order;

  for (const fact of facts) {
    console.log('new fact: ', fact);
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
    entityTypes: count(graph.mapNodes((_, attributes: Record<string, unknown>) => attributes.type), SEED_ENTITY_TYPES),
    predicates: count(graph.mapEdges((_, attributes: Record<string, unknown>) => attributes.predicate), SEED_PREDICATES)
  };
}

async function extractFacts(text: string): Promise<Fact[]> {
  const openai = new OpenAI(); // Created lazily so a missing OPENAI_API_KEY doesn't fail at import time.
  const { entityTypes, predicates } = vocabulary();
  const res = await openai.chat.completions.create({
    model: "gpt-6-luna",
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

function withoutEmpty(attributes: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(attributes).filter(([, value]) => value));
}
