# next-insights-rag

Analysts ask one question over a small set of articles. The service answers from those articles 

## How to run it

Add `OPENAI_API_KEY` in `.env.local` and run:
```bash
nvm use 24.5.0
npm run dev
```

## Evaluation
`evalution` directory contains test cases, test runner, metrics and results


With the app running locally, run the evaluation test suite:

```bash
npm run evaluation
```
    

## Libraries

FE & BE: `Next.js 16.4.0`

LLM Integration: `OpenAI API`, `LangChain.js`

Vector Storage: `hnswlib-node`

Knowledge Graph: `graphology`

## API

- `GET /api/articles` - List articles
- `POST /api/articles/create` - Create an article from text
- `POST /api/upload` - Upload an article file (.txt)
- `POST /api/articles/[articleId]/process` - Process an article (extract graph/vectors)
- `POST /api/search` - Search through processed articles using query
- `DELETE /api/delete` - Delete all articles, graph and vectors

## Diagrams

### 1. Indexing

```mermaid
%%{init: {"themeVariables": {"fontSize": "16"}, "flowchart": {"padding": 20, "nodeSpacing": 40, "rankSpacing": 50}}}%%
flowchart TD
    Upload["1. Upload Article (.txt)"] --> Extract["2. Extract Text"]
    
    Extract --> VectorPipeline["Vector Pipeline"]
    Extract --> GraphPipeline["Knowledge Graph Pipeline"]

    subgraph Vector Pipeline
        VectorPipeline --> Split["Split text into small chunks"]
        Split --> Embed["Generate vector embeddings<br/><i>(text-embedding-3-small)</i>"]
        Embed --> SaveVector["Save vectors to index<br/><i>(hnswlib-node & chunks.json)</i>"]
    end

    subgraph Knowledge Graph Pipeline
        GraphPipeline --> Facts["Extract facts & triples<br/><i>(gpt-6.1-sol)</i>"]
        Facts --> SaveGraph["Save entities & relationships<br/><i>(In-memory MultiDirectedGraph)</i>"]
    end
```

### 2. Query

```mermaid
%%{init: {"themeVariables": {"fontSize": "16"}, "flowchart": {"padding": 20, "nodeSpacing": 40, "rankSpacing": 50}}}%%
flowchart TD
    User["👤 Analyst asks a question"] --> API["Search Request"]

    API --> GraphSearch["Graph Retrieval"]
    API --> HybridSearch["Vector & Text Search"]

    subgraph Graph Retrieval
        GraphSearch --> ExtractEntities["Extract names & concepts from query"]
        ExtractEntities --> MatchGraph["Find matching entities & facts in Graph"]
    end

    subgraph Hybrid Search
        HybridSearch --> Semantic["Dense Search<br/><i>(Vector Similarity)</i>"]
        HybridSearch --> Keyword["Sparse Search<br/><i>(BM25 Keyword Match)</i>"]
        Semantic --> Combine["Reciprocal Rank Fusion<br/><i>(Combine top 5 results)</i>"]
        Keyword --> Combine
    end

    MatchGraph --> Merge["Merge Graph Facts + Text Chunks"]
    Combine --> Merge

    Merge --> LLM["LLM Answer Generator<br/><i>(gpt-6.1-sol)</i>"]
    LLM --> Verify["Verify Sources & Citations"]
    Verify --> Answer["👤 Response returned with sources"]
```