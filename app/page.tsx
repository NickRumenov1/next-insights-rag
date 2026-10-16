"use client";

import { useEffect, useState } from "react";

type ArticleItem = {
  id: string;
  name: string;
  text: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/articles")
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { articles?: ArticleItem[] };
        if (!cancelled) setArticles(payload.articles ?? []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not search the articles.");
        return;
      }
      setAnswer(payload.answer ?? "");
    } catch {
      setError("Could not search the articles.");
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".pdf")) {
      setError("Only .txt and .pdf files are supported.");
      return;
    }

    setError(null);
    setReading(true);

    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as {
        error?: string;
        article?: ArticleItem;
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not read that file.");
        return;
      }
      if (payload.article) {
        const uploaded = payload.article;
        setArticles((current) =>
          current.some((item) => item.id === uploaded.id)
            ? current
            : [...current, uploaded],
        );

        const processed = await fetch(`/api/articles/${uploaded.id}/process`, { method: "POST" });
        if (!processed.ok) {
          const failure = (await processed.json().catch(() => null)) as { error?: string } | null;
          setError(failure?.error ?? "Could not process that article.");
        }
      }
    } catch {
      setError("Could not read that file.");
    } finally {
      setReading(false);
    }
  }

  async function onDeleteArticles() {
    setError(null);

    try {
      const response = await fetch("/api/delete", { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Could not delete the articles.");
        return;
      }
      setArticles([]);
    } catch {
      setError("Could not delete the articles.");
    }
  }

  return (
    <div className="flex flex-1 bg-zinc-950 font-sans text-zinc-100">
      <main className="flex w-full flex-col gap-10 px-8 py-10 sm:px-12 sm:py-14 md:flex-row md:items-start md:justify-between">
        <div className="flex w-full max-w-xl flex-col gap-4">
          <form className="flex items-center gap-3" onSubmit={onSearch}>
            <input
              id="query"
              type="text"
              value={query}
              placeholder="Enter your query"
              onChange={(event) => setQuery(event.target.value)}
              className="h-16 min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-4 text-lg text-zinc-50 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
            />
            <button
              type="submit"
              style={{ cursor: "pointer" }}
              disabled={query.trim().length === 0}
              className="h-16 shrink-0 rounded-lg bg-zinc-100 px-5 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-60"
            >
              Submit
            </button>
          </form>
          <section
            aria-label="Answer"
            className="flex min-h-64 w-full flex-col rounded-lg border border-zinc-600 bg-zinc-900 p-4"
          >
            {answer ? (
              <p className="whitespace-pre-wrap text-base leading-7 text-zinc-100">{answer}</p>
            ) : null}
          </section>
        </div>

        <div className="flex w-full max-w-xl flex-col gap-4 md:w-80 md:shrink-0">
        <form
          aria-label="Add article"
          className="flex w-full flex-col gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <label
            className={`inline-flex h-12 items-center justify-center rounded-lg bg-zinc-100 px-5 text-sm font-medium text-zinc-950 hover:bg-white ${reading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          >
            {reading ? "Reading…" : "Upload"}
            <input
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              className="sr-only"
              disabled={reading}
              onChange={onFileChange}
            />
          </label>
          <p className="text-sm text-zinc-400">* Supports .txt and .pdf files only</p>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="h-px flex-1 bg-zinc-700" />
          </div>
        </form>
        {articles.length > 0 ? (
          <button
            type="button"
            onClick={onDeleteArticles}
            style={{ cursor: "pointer" }}
            className="h-12 rounded-lg border border-red-400 px-5 text-sm font-medium text-red-300 hover:bg-red-950"
          >
            Delete articles
          </button>
        ) : null}
        {articles.length > 0 ? (
          <ul aria-label="Articles" className="flex flex-col gap-2">
            {articles.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3"
              >
                <p className="text-xs font-medium text-zinc-400">{item.name}</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">{item.text}</p>
              </li>
            ))}
          </ul>
        ) : null}
        </div>
      </main>
    </div>
  );
}
