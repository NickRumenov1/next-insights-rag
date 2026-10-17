import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { ARTICLES_DIR } from "../articles/service";
import { matchEntities, searchGraph } from "./graph-search";
import { searchVectors } from "./vector-search";

/** One normalized piece of support: a graph fact rendered as a sentence, or a vector chunk. */
type Evidence = { id: string; articleId: string; source: "Graph" | "RAG"; text: string };

export async function search(query: string) {
  const [chunks, { entities, predicates }] = await Promise.all([searchVectors(query), matchEntities(query)]);
  const evidence: Evidence[] = [
    ...searchGraph(entities, predicates).map((item) => ({ ...item, source: "Graph" as const })),
    ...chunks.map(({ articleId, text }) => ({ articleId, text, source: "RAG" as const })),
  ].map((item, position) => ({ ...item, id: `E${position + 1}` }));

  return answerFromEvidence(query, evidence);
}

export async function promptForJson<T = Record<string, string[]>>(system: string, user: string) {
  const openai = new OpenAI();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(res.choices[0]?.message.content ?? "{}") as T;
}

const NO_ANSWER = "No article states the answer to the question.";

/** One GPT call judges the merged evidence; code then keeps only citations that exist and builds the sources. */
async function answerFromEvidence(query: string, evidence: Evidence[]) {
  const verdict = await promptForJson<{ verdict?: string; answer?: string; evidenceIds?: string[] }>(
    `Answer the question using only the numbered evidence. Evidence is a graph fact ([Graph], a sentence; a word in parentheses after an entity is its sector) or an article excerpt ([RAG]).
Reply with JSON: {"verdict": "answer" | "conflict" | "none", "answer": "<one short sentence>", "evidenceIds": ["E1"]}.
Rules:
- Use only what the evidence explicitly states. Hopes, speculation and "might someday" support nothing.
- A fact marked NOT TRUE, or an article saying something did not happen, never supports the answer. If one evidence denies a fact and another affirms it, or two give different values for the same fact, verdict "conflict": state that the articles disagree and what each says.
- The relation must be the one asked: acquired is not invested in, announced is not completed, a price is not a date, a year is not a month.
- Respect direction: "Who acquired Salesforce?" is not answered by "Salesforce acquired Slack".
- A question with several conditions needs one entity that meets every condition, each backed by evidence about that same entity. Evidence about different entities never combines. A category such as "database companies" is met by the entity's sector.
- Evidence that merely mentions the entities without stating the answer supports nothing.
- "answer": a short sentence, e.g. "Salesforce acquired Slack in 2021." Use short entity names. For several answers list them all.
- When the evidence does not state the answer: verdict "none", evidenceIds [], answer exactly "No article states <the answer to the question>." using the question's own wording and names (e.g. "No article states which company acquired Stack.").
- evidenceIds lists only the evidence the answer actually rests on.`,
    `Evidence:\n${evidence.map((item) => `${item.id} [${item.source}]: ${item.text}`).join("\n")}\n\nQuestion: ${query}`,
  );

  const ids = new Set(evidence.map((item) => item.id));
  const cited = (verdict.evidenceIds ?? []).filter((id) => ids.has(id));
  const none = verdict.verdict === "none" || cited.length === 0;
  if (none) {
    const answer = verdict.answer?.trim() ?? "";
    return { answer: answer.startsWith("No article states") ? answer : NO_ANSWER, sources: [] };
  }

  // One entry per cited article; Graph wins when both a fact and an excerpt of it were cited.
  const labels = new Map<string, "Graph" | "RAG">();
  for (const item of evidence.filter((item) => cited.includes(item.id))) {
    if (item.source === "Graph" || !labels.has(item.articleId)) labels.set(item.articleId, item.source);
  }
  const sources = await Promise.all(
    [...labels].map(async ([articleId, source]) => ({ articleId, name: await articleName(articleId), source })),
  );
  return { answer: verdict.answer?.trim() ?? "", sources };
}

async function articleName(articleId: string): Promise<string> {
  try {
    const { name } = JSON.parse(await readFile(path.join(ARTICLES_DIR, articleId, "article.json"), "utf8")) as { name: string };
    return name.replace(/\.(txt|pdf)$/i, "");
  } catch {
    return articleId;
  }
}
