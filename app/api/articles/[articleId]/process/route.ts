import { HttpError } from "../../service";
import { processArticle } from "./service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  try {
    const { articleId } = await params;
    return Response.json(await processArticle(articleId));
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Could not process that article." }, { status: 500 });
  }
}
