import { connection } from "next/server";
import { listArticles } from "./service";

export async function GET() {
  await connection();
  return Response.json({ articles: await listArticles() });
}
