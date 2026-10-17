import type { TestCase } from "./test-cases.ts";
import OpenAI from "openai";

/** The answer must state the same facts as the expected sentence. */
export async function scoreCase(test: TestCase, answer: string): Promise<string[]> {
  return (await sameMeaning(answer, test.expected)) ? [] : [`answer:   "${answer}"\nexpected: "${test.expected}"`];
}

async function sameMeaning(got: string, expected: string): Promise<boolean> {
  const res = await new OpenAI().chat.completions.create({
    model: "gpt-6.1-sol",
    messages: [
      {
        role: "system",
        content: 'Do the two answers state the same facts (wording may differ, but nothing missing, added or contradicted)? Reply with only "yes" or "no".',
      },
      { role: "user", content: `A: ${got}\nB: ${expected}` },
    ],
  });
  return res.choices[0]?.message.content?.trim().toLowerCase().startsWith("yes") ?? false;
}
