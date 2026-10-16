import type { ArticleInput } from "@/app/api/articles/[articleId]/process/route";

// Placeholder: the graph branch is not implemented yet.
export async function indexForGraph(input: ArticleInput): Promise<null> {
  void input;
  return null;
}
