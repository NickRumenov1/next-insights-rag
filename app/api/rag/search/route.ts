import { search } from "./service";

export async function POST(request: Request) {
  try {
    const { query } = (await request.json()) as { query?: unknown };
    if (typeof query !== "string" || !query.trim()) {
      return Response.json({ error: "Query is required." }, { status: 400 });
    }

    return Response.json(await search(query));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not search the articles." }, { status: 500 });
  }
}
