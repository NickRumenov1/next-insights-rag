export type ArticleInput = { articleId: string; name: string; text: string };

export type Chunk = { id: string; articleId: string; index: number; text: string };

export type ProcessResult = {
  articleId: string;
  vector: { chunks: Chunk[] };
  graph: null; // placeholder until the graph branch is implemented
};
