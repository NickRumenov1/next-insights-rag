# Architecture

Analysts ask one question over a small set of articles. The service answers from those articles and cites each supporting article as **Graph** or **RAG**.

`Spec.md` is the product scope. `examples/cases.yaml` is the behavior the retrieval and the answer have to match.

## Libraries

FE & BE: `Next.js 16.4.0`

LLM Integration: `OpenAI API`, `LangChain.js`, `LlamaIndex.TS`

Vector Storage: `hnswlib-node`

Knowledge Graph: `graphology`

## Diagrams

### 1. Indexing

```mermaid
%%{init: {"themeVariables": {"fontSize": "26"}, "flowchart": {"padding": 28, "nodeSpacing": 60, "rankSpacing": 70}}}%%
flowchart TD
    Upload["<b>POST /api/upload</b><br/>.txt or .pdf, saved to <b>data/articles/{id}/</b>"] --> Process["<b>POST /api/articles/{id}/process</b>"]
    Process --> Extract["Text extraction<br/>.txt: UTF-8 decode (BOM stripped)<br/>.pdf: <b>unpdf</b> <b>extractText</b>"]
    Extract --> Parallel{"<b>Promise.all</b>"}

    Parallel --> VectorBranch["Vector branch<br/><b>lib/rag/vector</b>"]
    Parallel --> GraphBranch["Graph branch<br/><b>lib/rag/graph</b><br/><b>graphology</b>, not implemented yet"]

    VectorBranch --> Splitter["<b>@langchain/textsplitters</b><br/><b>RecursiveCharacterTextSplitter</b><br/><b>chunkSize</b> 500, <b>overlap</b> 50"]
    Splitter --> Chunks["Text chunks<br/>id <b>{articleId}-{index}</b>, <b>articleId</b>, <b>index</b>, <b>text</b>"]
    Chunks --> Embedder["<b>openai</b> SDK: <b>embeddings.create</b><br/>model <b>text-embedding-3-small</b><br/>one batched request per article"]
    Embedder --> Vectors["Embedding vectors<br/>1536 dimensions, one per chunk"]
    Vectors --> HnswIndex["<b>hnswlib-node</b> <b>HierarchicalNSW</b><br/>cosine space, label = chunk position<br/><b>data/vectors/index.dat</b>"]
    Chunks --> ChunksFile["Chunk store<br/><b>data/vectors/chunks.json</b><br/>array position = HNSW label"]
```

### 2. Query 