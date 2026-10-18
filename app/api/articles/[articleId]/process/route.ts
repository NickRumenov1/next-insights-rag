import { HttpError } from "../../service";
import { processArticle } from "./service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const { articleId } = await params;
    await processArticle(articleId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Could not process that article." }, { status: 500 });
  }
}
