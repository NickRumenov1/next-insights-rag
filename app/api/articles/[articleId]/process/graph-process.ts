import { MultiDirectedGraph } from "graphology";
import OpenAI from "openai";
const SEED_ENTITIES = ["organization", "person", "product", "technology", "location", "event"];
const SEED_PREDICATES = ["acquired", "invested_in", "partnered_with", "launched", "announced", "reported",];
const VOCABULARY_SIZE = 200;

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
 * Extracts facts from an article and adds them to the shared graph.
 * Entities become nodes, and facts become edges tagged with the source article.
 *
 * @param articleId The article id.
 * @param text The article text.
 *
 * @example
 * // Article: "Acme acquired Beta in March 2026.
 * //          Acme reported revenue of $12.3B in Q3 2026."
 * await indexForGraph("a1", text);
 *
 * // Resulting graph:
 * //
 * //  Acme ──[acquired, date: "March 2026"]──> Beta
 * //    │
 * //    └──[reported, metric: "revenue", value: "12.3",
 * //         unit: "USD billion", period: "Q3 2026"]──> Acme // self-loop since there is no object
 */
export async function indexForGraph(articleId: string, text: string): Promise<void> {

  const facts = (await extractFacts(text)).filter((f) => f.subject && f.predicate && (f.object || f.value));

  for (const fact of facts) {

    // Merge subject and object nodes; skip the object if there isn't one.
    // Example with object: "Salesforce acquired Slack"
    //   fact.subject = "Salesforce"
    //   fact.subjectType = "organization", fact.subjectSector = "CRM"
    //   fact.object = "Slack"
    //   fact.objectType = "organization", fact.objectSector = "messaging"
    //
    // Example without object: "Acme reported revenue of $12.3B"
    //   fact.subject = "Acme"
    //   fact.subjectType = "organization", fact.subjectSector = "finance"
    //   fact.object = undefined, fact.objectType = undefined, fact.objectSector = undefined
    for (const { name, type, sector } of [
      { name: fact.subject, type: fact.subjectType, sector: fact.subjectSector },
      { name: fact.object, type: fact.objectType, sector: fact.objectSector },
    ]) {
      if (!name) continue;

      graph.mergeNode(name, {
        ...(type && { type: normalizeTerm(type) }),
        ...(sector && { sector }),
      });
    }

    // Add an edge for each fact, linking the subject to the object and recording its source article.
    // Example: Salesforce -> Slack (predicate: "acquired", date: "July 2021").
    // If there's no object (e.g. Acme reported revenue), create a self-loop: Acme -> Acme,
    graph.addEdge(fact.subject, fact.object || fact.subject, {
      predicate: normalizeTerm(fact.predicate),
      articleId,
      date: fact.date || undefined,
      negated: fact.negated === true,
      ...(fact.metric ? { metric: fact.metric } : {}),
      ...(fact.value ? { value: fact.value } : {}),
      ...(fact.unit ? { unit: fact.unit } : {}),
      ...(fact.period ? { period: fact.period } : {}),
    });
  }
}

/** Entity types and predicates ranked by use in the graph; each generic seed counts as one extra use. */
export function vocabulary() {
  const mostUsedWithSeeds = (values: unknown[], seeds: string[]) => {
    // Each initially seeded term starts with 1 use so it also ranks it with the new ones
    const uses = new Map(seeds.map((seed) => [seed, 1]));
    for (const value of values) {
      if (typeof value === "string") uses.set(value, (uses.get(value) ?? 0) + 1);
    }
    return [...uses].sort((a, b) => b[1] - a[1]).slice(0, VOCABULARY_SIZE).map(([term]) => term);
  };

  return {
    entityTypes: mostUsedWithSeeds(graph.mapNodes((_, { type }) => type), SEED_ENTITIES),
    predicates: mostUsedWithSeeds(graph.mapEdges((_, { predicate }) => predicate), SEED_PREDICATES),
  };
}

async function extractFacts(text: string): Promise<Fact[]> {
  const openai = new OpenAI();
  const { entityTypes, predicates } = vocabulary();
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-6.1-sol",
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
  return (JSON.parse(res.choices[0]?.message.content ?? "{}") as { facts?: Fact[] }).facts ?? [];
}

// Organization -> organization, "  Invested In " -> invested_in, "partnered   with" -> partnered_with
const normalizeTerm = (term: string) => term.trim().toLowerCase().replace(/\s+/g, "_");
