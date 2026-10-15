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
flowchart TD
    Articles["Articles"] --> VectorBranch["Vector branch"]
    VectorBranch --> Splitter["LangChain RecursiveCharacterTextSplitter<br/>chunkSize 500, overlap 50"]
    Splitter --> Chunks["Text chunks"]
    Chunks --> Embedder["OpenAI Embeddings API<br/>model text-embedding-3-small<br/>one batched request per article"]
    Embedder --> Vectors["Embedding vectors<br/>1536 dimensions, one per chunk"]
```

### 2. Query 