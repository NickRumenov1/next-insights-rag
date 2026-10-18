import type { TestCase } from "./test-cases.ts";
import OpenAI from "openai";

/** The answer must state the same facts as the expected sentence. */
export async function scoreCase(test: TestCase, answer: string): Promise<string[]> {
  return (await sameMeaning(test.query, answer, test.expected)) ? [] : [`answer:   "${answer}"\nexpected: "${test.expected}"`];
}

async function sameMeaning(question: string, got: string, expected: string): Promise<boolean> {
  const res = await new OpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-6.1-sol",
    messages: [
      {
        role: "system",
        content:
          'You grade an answer (A) against a reference answer (B) for a question. Reply "yes" if A is correct, i.e. it contains the key facts of B and does not contradict B. Ignore wording, phrasing, sentence structure, completeness of the sentence, and extra harmless detail or context in A (e.g. A repeating the question\'s subject, or B being only a short phrase). Reply "no" only if A misses a key fact from B, states something different from B, or answers a different question. Reply with only "yes" or "no".',
      },
      { role: "user", content: `Question: ${question}\nA: ${got}\nB: ${expected}` },
    ],
  });
  return res.choices[0]?.message.content?.trim().toLowerCase().startsWith("yes") ?? false;
}
