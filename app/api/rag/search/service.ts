import OpenAI from "openai";
import { matchEntities, searchGraph } from "./graph-search";
import { searchVectors } from "./vector-search";

/** One normalized piece of support: a graph fact rendered as a sentence, or a vector chunk. */
type Evidence = { id: string; text: string };

const ANSWER_INTRO = `Answer the question using only the numbered evidence. Evidence is a graph fact (a sentence; a word in parentheses after an entity is its sector) or an article excerpt.
Reply with JSON: {"verdict": "answer" | "conflict" | "none", "answer": "<one short sentence, or the conflict format below>", "evidenceIds": ["E1"]}.`;

const ANSWER_RULES = [
  `Use only what the evidence explicitly states. Hopes, speculation and "might someday" support nothing.`,
  `A fact marked NOT TRUE, or an article saying something did not happen, never supports the answer. If one evidence denies a fact and another affirms it, or two give different values for the same fact, verdict "conflict". Never merge conflicting claims into one sentence ("5% and 7%" is wrong). A conflict answer must start with "The articles disagree. One says <first claim>. The other says <second claim>." keeping each claim as stated, with its details, e.g. "The articles disagree. One says Acme grew 5% in 2024. The other says Acme grew 7% in 2024."`,
  `The relation must be the one asked: acquired is not invested in, announced is not completed, a price is not a date, a year is not a month.`,
  `Respect direction: "Who acquired Salesforce?" is not answered by "Salesforce acquired Slack", but "Which companies did Salesforce acquire?" is answered by every evidence of the form "Salesforce acquired <company>": list all of them.`,
  `Only for a question with several conditions: one entity must meet every condition, each backed by evidence about that same entity, and evidence about different entities never combines. Every entity that meets all conditions is an answer: list all of them. This does not apply to a question asking for a list; there, every matching evidence is one more item of the answer. A category such as "database companies" is met by the entity's sector.`,
  `Evidence that merely mentions the entities without stating the answer supports nothing.`,
  `A date, place or figure belongs to a fact only if that same evidence names the fact's entities. If a question asks for several things (e.g. "who, and when") and one part has no such evidence, answer the supported part and say the articles don't say the other part, mentioning any evidence that lacks the entity names (e.g. "Acme bought Beta, but the articles don't say when. One mentions a deal in 2019 without naming the companies.").`,
  `"answer": a short sentence that gives only what the question asks (a date only if it asks when), e.g. "Salesforce acquired Slack." Use short entity names, and name entities as the evidence does ("AI startup Voyage", never "an AI startup"). For several answers list them all.`,
  `"Matched entities" are the question's entities resolved to graph names (a misspelling is already corrected). Treat them as the entities the question asks about.`,
  `When the evidence does not state the answer: verdict "none", evidenceIds [], answer exactly "No article states <the answer to the question>." using the question's own wording and names (e.g. "No article states which company acquired Stack.").`,
  `evidenceIds lists only the evidence the answer actually rests on.`,
];

const ANSWER_PROMPT = `${ANSWER_INTRO}\nRules:\n${ANSWER_RULES.map((rule) => `- ${rule}`).join("\n")}`;

export async function search(query: string) {
  const [chunks, { entities, predicates }] = await Promise.all([searchVectors(query), matchEntities(query)]);
  const evidence: Evidence[] = [
    ...searchGraph(entities, predicates),
    ...chunks,
  ].map(({ text }, position) => ({ id: `E${position + 1}`, text }));

  return answerFromEvidence(query, evidence, entities);
}

async function answerFromEvidence(query: string, evidence: Evidence[], entities: string[]) {
  const verdict = await promptForJson<{ verdict?: string; answer?: string; evidenceIds?: string[] }>(
    ANSWER_PROMPT,
    `Evidence:\n${evidence.map((item) => `${item.id}: ${item.text}`).join("\n")}\n\nMatched entities: ${entities.join(", ") || "none"}\n\nQuestion: ${query}`,
  );

  const ids = new Set(evidence.map((item) => item.id));
  const cited = (verdict.evidenceIds ?? []).filter((id) => ids.has(id));
  const none = verdict.verdict === "none" || cited.length === 0;
  if (none) {
    const answer = verdict.answer?.trim() ?? "";
    return { answer: answer.startsWith("No article states") ? answer : "No article states the answer to the question." };
  }

  return { answer: verdict.answer?.trim() ?? "" };
}

export async function promptForJson<T = Record<string, string[]>>(system: string, user: string) {
  const openai = new OpenAI();
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-6.1-sol",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(res.choices[0]?.message.content ?? "{}") as T;
}