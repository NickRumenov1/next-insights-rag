"use client";

import { useEffect, useState } from "react";

type SourceItem = { articleId: string; name: string; source: "Graph" | "RAG" };

type ArticleItem = {
  id: string;
  name: string;
  text: string;
};

const browser = typeof window === "undefined" ? null : (window as Window & { __printApiLogs?: boolean });
if (browser && !browser.__printApiLogs) {
  browser.__printApiLogs = true;
  const originalFetch = browser.fetch.bind(browser);
  browser.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("/api")) return response;
    const payload = (await response.clone().json().catch(() => null)) as { logs?: unknown } | null;
    if (Array.isArray(payload?.logs)) {
      for (const line of payload.logs) console.log(line);
    }
    return response;
  };
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [reading, setReading] = useState(false);
  const [articleText, setArticleText] = useState("");
  const [saving, setSaving] = useState(false);

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
    setSearching(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = (await response.json()) as { answer?: string; sources?: SourceItem[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not search the articles.");
        return;
      }
      setAnswer(payload.answer ?? "");
      setSources(payload.sources ?? []);
    } catch {
      setError("Could not search the articles.");
    } finally {
      setSearching(false);
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".txt")) {
      setError("Only .txt files are supported.");
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
        const failure = (await processed.json().catch(() => null)) as { error?: string } | null;
        if (!processed.ok) {
          setError(failure?.error ?? "Could not process that article.");
        }
      }
    } catch {
      setError("Could not read that file.");
    } finally {
      setReading(false);
    }
  }

  async function onSaveText(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/articles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: articleText }),
      });
      const payload = (await response.json()) as { error?: string; article?: ArticleItem };
      if (!response.ok || !payload.article) {
        setError(payload.error ?? "Could not save the article.");
        return;
      }
      const saved = payload.article;
      setArticles((current) => [...current, saved]);
      setArticleText("");

      const processed = await fetch(`/api/articles/${saved.id}/process`, { method: "POST" });
      const failure = (await processed.json().catch(() => null)) as { error?: string } | null;
      if (!processed.ok) {
        setError(failure?.error ?? "Could not process that article.");
      }
    } catch {
      setError("Could not save the article.");
    } finally {
      setSaving(false);
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
    <div className="flex min-h-screen flex-1 bg-zinc-950 font-sans text-zinc-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
        <div className="flex w-full flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
          <form className="flex items-center gap-3" onSubmit={onSearch}>
            <input
              id="query"
              type="text"
              value={query}
              placeholder="Enter your query"
              onChange={(event) => setQuery(event.target.value)}
              className="h-14 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-base text-zinc-50 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
            />
            <button
              type="submit"
              style={{ cursor: searching ? "default" : "pointer" }}
              disabled={searching || query.trim().length === 0}
              className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-6 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
            >
              {searching ? (
                <span className="size-4 animate-spin rounded-full border-2 border-zinc-950/25 border-t-zinc-950" />
              ) : null}
              {searching ? "Searching" : "Submit"}
            </button>
          </form>
          <section
            aria-label="Answer"
            className="flex min-h-64 w-full flex-col rounded-lg border border-zinc-800 bg-zinc-950/80 p-5"
          >
            {answer ? (
              <p className="whitespace-pre-wrap text-base leading-7 text-zinc-100">{answer}</p>
            ) : null}
            {sources.length > 0 ? (
              <p className="mt-auto pt-4 text-sm text-zinc-400 border-t border-zinc-800/80">
                {sources.map((item) => `${item.name}.txt [${item.source}]`).join(", ")}
              </p>
            ) : null}
          </section>
        </div>
        <div className="flex w-full flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
          <form
            aria-label="Add article"
            className="flex w-full flex-col gap-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <label
              className={`inline-flex h-12 items-center justify-center rounded-lg bg-zinc-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white ${reading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
            >
              {reading ? "Reading…" : "Upload .txt file"}
              <input
                type="file"
                accept=".txt,text/plain"
                className="sr-only"
                disabled={reading}
                onChange={onFileChange}
              />
            </label>
            {error ? <p className="text-sm text-red-400 text-center">{error}</p> : null}
            <div className="flex items-center gap-3 text-xs text-zinc-500 my-1">
              <span className="h-px flex-1 bg-zinc-800" />
              <span>OR</span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>
          </form>
          <form className="flex w-full flex-col gap-3" onSubmit={onSaveText}>
            <textarea
              value={articleText}
              placeholder="Article text"
              rows={5}
              onChange={(event) => setArticleText(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
            />
            <button
              type="submit"
              style={{ cursor: "pointer" }}
              disabled={saving || articleText.trim().length === 0}
              className="h-11 rounded-lg bg-zinc-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      </div>
      <div className="flex w-full flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-bold text-zinc-100">Uploaded articles</h2>
        {articles.length > 0 ? (
          <button
            type="button"
            onClick={onDeleteArticles}
            style={{ cursor: "pointer" }}
            className="h-10 rounded-lg border border-red-500/50 bg-red-950/30 px-4 text-xs font-semibold text-red-300 hover:bg-red-900/50 hover:border-red-400 transition"
          >
            Reset data (articles, vectors & graph)
          </button>
        ) : null}
      </div>

      {articles.length > 0 ? (
        <ul aria-label="Articles" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {articles.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/90 p-4"
            >
              <p className="text-xs font-semibold text-zinc-400 border-b border-zinc-800/60 pb-1.5">{item.name}</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{item.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
    </main>
  </div>
  );
}
