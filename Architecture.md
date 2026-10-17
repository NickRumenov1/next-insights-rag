# Architecture

Analysts ask one question over a small set of articles. The service answers from those articles and cites each supporting article as **Graph** or **RAG**.

`Spec.md` is the product scope. `evaluation/test-cases.ts` is the behavior the retrieval and the answer have to match.

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
    Extract --> VectorBranch["Vector branch<br/><b>lib/rag/vector</b>"]
    Extract --> GraphBranch["Graph branch<br/><b>lib/rag/graph</b>"]

    VectorBranch --> Splitter["<b>@langchain/textsplitters</b><br/><b>RecursiveCharacterTextSplitter</b><br/><b>chunkSize</b> 500, <b>overlap</b> 50"]
    Splitter --> Chunks["Text chunks<br/>id <b>{articleId}-{index}</b>, <b>articleId</b>, <b>index</b>, <b>text</b>"]
    Chunks --> Embedder["<b>Openai</b>: <b>embeddings.create</b><br/>model <b>text-embedding-3-small</b><br/>one batched request per article"]
    Embedder --> Vectors["Embedding vectors<br/>1536 dimensions, one per chunk"]
    Vectors --> HnswIndex["<b>hnswlib-node</b> <b>HierarchicalNSW</b><br/>cosine space, label = chunk position<br/><b>data/vectors/index.dat</b>"]
    Chunks --> ChunksFile["Chunk store<br/><b>data/vectors/chunks.json</b><br/>array position = HNSW label"]

    GraphBranch --> Facts["Fact extraction<br/><b>gpt-4o-mini</b> JSON triples<br/>learned vocabulary (top types and predicates from the graph, generic seed fallback)<br/>value facts (metric, value, unit, period) as self-loop edges"]
    Facts --> GraphStore["<b>graphology</b> <b>MultiDirectedGraph</b><br/>in memory, on <b>globalThis</b><br/>node = entity, edge = predicate, <b>articleId</b>, date, negated"]
```

### 2. Query

```mermaid
%%{init: {"themeVariables": {"fontSize": "26"}, "flowchart": {"padding": 28, "nodeSpacing": 200, "rankSpacing": 70}}}%%
flowchart TD
    UI["👤<br/><b>Analyst</b><br/>asks a question in the app<br/><b>fetch</b> POST <b>/api/search</b><br/>body <b>{ query }</b>"] --> Route["<b>POST /api/search</b><br/><b>app/api/search/route.ts</b>"]
    Route --> Retrieve["Retrieval<br/><b>searchVectors(query, k = 5)</b><br/><b>app/api/search/route.ts</b>"]
    Route --> GraphMatch["<b>matchEntities(query)</b><br/><b>app/api/search/route.ts</b><br/>returns [] when <b>graph.order</b> is 0"]
    GraphMatch --> ExtractNames["<b>extractQuery(query)</b><br/><b>app/api/search/route.ts</b><br/><b>OpenAI</b>: <b>chat.completions.create</b><br/>model <b>gpt-4o-mini</b>, <b>temperature</b> 0, JSON object response<br/>extracts proper names from the query alone, plus the <b>predicates</b> it asks about (only from <b>vocabulary()</b>)<br/>no names: skips request 2"]
    ExtractNames --> MapNodes["<b>mapNamesToNodes(names)</b><br/><b>app/api/search/route.ts</b><br/><b>openai</b> SDK: <b>chat.completions.create</b><br/>model <b>gpt-4o-mini</b>, <b>temperature</b> 0, JSON object response<br/>maps the names to <b>graph.nodes()</b> of the <b>graphology</b> <b>MultiDirectedGraph</b> from <b>lib/rag/graph</b><br/>(typos and aliases match, different words do not)"]
    MapNodes --> SearchGraph["<b>searchGraph(entities, predicates)</b><br/><b>lib/rag/graph</b><br/>entities: every edge touching them, both directions<br/>no entities: every edge with the predicates<br/>edges rendered as sentences (negation, date, sector)"]
    Retrieve --> ReadChunks["<b>readChunks()</b><br/><b>lib/rag/vector</b><br/>reads <b>data/vectors/chunks.json</b>"]
    ReadChunks --> Dense["Dense ranker"]
    ReadChunks --> Sparse["Sparse ranker"]
    Dense --> EmbedQuery["<b>embedChunks()</b><br/><b>lib/rag/vector</b><br/><b>openai</b> SDK: <b>embeddings.create</b><br/>model <b>text-embedding-3-small</b><br/>one request, the query as the only input"]
    EmbedQuery --> Knn["<b>hnswlib-node</b> <b>HierarchicalNSW</b>, cosine space, 1536 dimensions<br/><b>readIndexSync</b> <b>data/vectors/index.dat</b><br/><b>index.searchKnn</b>, k = <b>min(20, getCurrentCount())</b><br/>returns neighbor labels = chunk positions, best first"]

    Sparse --> Bm25["<b>bm25Rank(query, chunks)</b><br/><b>lib/rag/vector</b><br/>tokenize: lowercase, <b>[a-z0-9]+</b><br/>k1 = 1.5, b = 0.75<br/>drops zero-score chunks"]
    Bm25 --> Top20["<b>.slice(0, 20)</b><br/>chunk positions, best first"]

    Knn --> Rrf["Reciprocal Rank Fusion<br/>score += <b>1 / (60 + rank + 1)</b> per ranker<br/>stored in a <b>Map</b> keyed by chunk position"]
    Top20 --> Rrf
    Rrf --> TopK["sort by fused score descending<br/><b>.slice(0, k = 5)</b><br/>map position to <b>chunks[position]</b>"]

    TopK --> Merge["Normalize and merge<br/><b>app/api/search/route.ts</b><br/><b>Evidence</b> { id, articleId, source, text }<br/>Graph facts first, then <b>RAG</b> chunks, numbered <b>E1..En</b>"]
    SearchGraph --> Merge
    Merge --> Answer["Answer and validation<br/><b>answerFromEvidence(query, evidence)</b><br/><b>app/api/search/route.ts</b>"]
    Answer --> Llm["<b>openai</b> SDK: <b>chat.completions.create</b><br/>model <b>gpt-4o-mini</b>, <b>temperature</b> 0, JSON object response<br/>{ verdict: answer | conflict | none, answer, evidenceIds }<br/>only explicit statements; negation, conflicts, relation, direction, granularity,<br/>multi-condition on one entity; otherwise &quot;No article states ...&quot;"]
    Llm --> Checks["Post-checks<br/>drop unknown <b>evidenceIds</b><br/>no valid id or verdict <b>none</b>: no sources<br/>one source per cited article, <b>Graph</b> wins over <b>RAG</b>"]
    Checks -->|"<b>{ answer, sources }</b>"| Shown["👤<br/><b>Analyst</b><br/>reads the answer and its sources"]
``` 