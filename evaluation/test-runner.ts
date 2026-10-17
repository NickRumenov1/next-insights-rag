// Runs evaluation/test-cases.ts against a running dev server (npm run dev).
//   node --env-file=.env.local evaluation/test-runner.ts [T-001 T-014 ...]
// WARNING: every case first calls DELETE /api/delete, which wipes all stored articles, vectors and the graph.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scoreCase } from "./metrics.ts";
import { testCases } from "./test-cases.ts";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const RESULTS_DIR = new URL("./results/", import.meta.url);

async function call(apiPath: string, method: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${apiPath}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${apiPath} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function runCase(test: (typeof testCases)[number]) {
  await call("/api/delete", "DELETE");
  for (const article of test.articles) {
    const { article: saved } = await call("/api/articles/create", "POST", { title: article.name, text: article.text });
    await call(`/api/articles/${saved.id}/process`, "POST");
  }

  const { answer } = (await call("/api/search", "POST", { query: test.query })) as { answer: string };
  return scoreCase(test, answer);
}

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;

const only = process.argv.slice(2);
const cases = testCases.filter((item) => only.length === 0 || only.includes(item.id));

const results: { id: string; passed: boolean; failures: string[] }[] = [];
for (const test of cases) {
  console.log("-----");
  try {
    const failures = await runCase(test);
    const passed = failures.length === 0;
    results.push({ id: test.id, passed, failures });
    console.log(`${passed ? green("PASS") : red("FAIL")} ${test.id} ${test.query}`);
    for (const line of failures) for (const row of line.split("\n")) console.log(red(`     ${row}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ id: test.id, passed: false, failures: [message] });
    console.log(`${red("FAIL")} ${test.id} ${test.query}\n${red(`     ${message}`)}`);
  }
}

const passed = results.filter((item) => item.passed).length;
const summary = `${passed}/${cases.length} passed`;
console.log(`-----\n${passed === cases.length ? green(summary) : red(summary)}`);

await mkdir(RESULTS_DIR, { recursive: true });
const date = new Date().toLocaleString("en-GB").replace(/[/:,\s]/g, "-");
const file = path.join(RESULTS_DIR.pathname, `${date}.json`);
await writeFile(file, JSON.stringify({ passed, total: cases.length, results }, null, 2));
console.log(`results: ${file}`);

process.exit(passed === cases.length ? 0 : 1);
