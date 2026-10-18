import { HttpError } from "../service";
import { createArticles } from "./service";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { articles?: { text?: unknown }[] } | null;
    return Response.json({ articles: await createArticles(body) });
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Could not save the article." }, { status: 500 });
  }
}
