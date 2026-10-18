import { graph, vocabulary } from "../articles/[articleId]/process/graph-process";
import { promptForJson } from "./service";

export function searchGraph(entities: string[], predicates: string[], limit = 30): { text: string }[] {
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
      const { predicate, date, negated, metric, value, unit, period } = graph.getEdgeAttributes(edge);
      const [subject, object] = [graph.source(edge), graph.target(edge)];
      const what = value
        ? [metric, value, unit, period && `in ${period}`].filter(Boolean).join(" ")
        : label(object);
      const text = `${label(subject)} ${String(predicate).replaceAll("_", " ")} ${what}${date ? `, ${date}` : ""}`;
      return { text: negated ? `NOT TRUE (the article denies it): ${text}` : text };
    });
}

/** Maps the question onto graph node ids (named entities) and graph predicates (relations it asks about). */
export async function matchEntities(query: string): Promise<{ entities: string[]; predicates: string[] }> {
  if (graph.order === 0) return { entities: [], predicates: [] };

  const { names, predicates } = await extractQuery(query);
  const entities = names.length === 0 ? [] : await mapNamesToNodes(names);
  return { entities: [...new Set(entities)].filter((name) => graph.hasNode(name)), predicates };
}

/** GPT step 1: names alone, so the node list can't pull in entities the question never wrote. Predicates come from the graph's own vocabulary. */
async function extractQuery(query: string): Promise<{ names: string[]; predicates: string[] }> {
  const known = vocabulary().predicates;
  const { names = [], predicates = [] } = await promptForJson(
    `List the proper names of entities (${vocabulary().entityTypes.join(", ")}) written in the question, exactly as spelled. Skip generic words ("company", "who", "AI startups"). Also list the relations the question asks about, using only these predicates: ${known.join(", ")} (bought -> acquired). Use [] when none fits. Reply with JSON: {"names": [], "predicates": []}. Example: "Who acquired Salesforce?" -> {"names": ["Salesforce"], "predicates": ["acquired"]}.`,
    query,
  );
  return { names, predicates: predicates.filter((predicate) => known.includes(predicate)) };
}

/** GPT step 2: maps each extracted name to an existing graph node. */
async function mapNamesToNodes(names: string[]): Promise<string[]> {
  const { entities = [] } = await promptForJson(
    `Map each given name to a graph node. Match the same entity only: an alias, a legal suffix, or a typo of that exact name ("Slak" -> "Slack"). A different real word is not a match ("Stack" is not "Slack"). Skip names with no node. Reply with JSON: {"entities": ["<exact node name>"]}.`,
    `Nodes:\n${graph.nodes().join("\n")}\n\nNames: ${JSON.stringify(names)}`,
  );
  return entities;
}
