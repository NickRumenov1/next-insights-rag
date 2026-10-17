import type { ArticleInput } from "@/app/api/articles/[articleId]/process/route";
import { MultiDirectedGraph } from "graphology";
import OpenAI from "openai";

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

export async function extractFacts(text: string): Promise<Fact[]> {
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

export async function indexForGraph(input: ArticleInput): Promise<{ nodes: number; edges: number }> {
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

  const result = { nodes: graph.order - nodesBefore, edges: facts.length };
  // console.log('vocabulary: ', vocabulary());
  return result;
}

/**
 * Facts as plain sentences, so the reader sees direction, negation, date and sector.
 * With entities: every edge touching them (either direction). Without: every edge with one of the predicates.
 * A non-empty predicates list narrows both.
 */
export function searchGraph(entities: string[], predicates: string[], limit = 30): { articleId: string; text: string }[] {
  const wanted = new Set(predicates);
  if (entities.length === 0 && wanted.size === 0) return [];

  const edges = entities.length ? new Set(entities.flatMap((entity) => graph.edges(entity))) : graph.edges();
  const label = (node: string) => {
    const sector = graph.getNodeAttribute(node, "sector");
    return sector ? `${node} (${sector})` : node;
  };

  return [...edges]
    .filter((edge) => wanted.size === 0 || wanted.has(graph.getEdgeAttribute(edge, "predicate")))
    .slice(0, limit)
    .map((edge) => {
      const { predicate, articleId, date, negated, metric, value, unit, period } = graph.getEdgeAttributes(edge);
      const [subject, object] = [graph.source(edge), graph.target(edge)];
      const what = value
        ? [metric, value, unit, period && `in ${period}`].filter(Boolean).join(" ")
        : label(object);
      const text = `${label(subject)} ${String(predicate).replaceAll("_", " ")} ${what}${date ? `, ${date}` : ""}`;
      return { articleId, text: negated ? `NOT TRUE (the article denies it): ${text}` : text };
    });
}

export function clearGraph() {
  graph.clear();
}

/** mergeNode would overwrite an existing attribute with undefined, so drop unset ones. */
function withoutEmpty(attributes: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(attributes).filter(([, value]) => value));
}
