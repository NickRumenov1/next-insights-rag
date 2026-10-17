export type TestCase = {
  id: string;
  query: string;
  articles: { name: string; text: string }[];
  expected: string;
};

export const testCases: TestCase[] = [
  {
    id: "T-001",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack in 2021." },
      { name: "art-2", text: "Salesforce acquired Slack for $27.7 billion." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-002",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack in 2021." },
      { name: "art-2", text: "Slack is a workplace messaging product." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-003",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Microsoft acquired LinkedIn in 2016." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states which company acquired Slack.",
  },
  {
    id: "T-004",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Slack is a great tool for internal communications." },
      { name: "art-2", text: "Many teams use Slack to share daily updates." },
    ],
    expected: "No article states which company acquired Slack.",
  },
  {
    id: "T-005",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "After the takeover, Slack became part of Salesforce." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-006",
    query: "Which company acquired Slack, and when?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack." },
      { name: "art-2", text: "The deal happened in 2023." },
    ],
    expected: "Salesforce acquired Slack, but the articles don't say when." +
        " One mentions a deal in 2023 without naming the companies.",
  },
  {
    id: "T-007",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Tableau." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states which company acquired Slack.",
  },
  {
    id: "T-008",
    query: "Which company did Salesforce acquire?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack." },
      { name: "art-2", text: "Salesforce acquired Tableau." },
    ],
    expected: "Salesforce acquired Slack and Tableau.",
  },
  {
    id: "T-009",
    query: "When did Salesforce acquire Slack?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack in 2021." },
      { name: "art-2", text: "Salesforce acquired Slack in 2022." },
    ],
    expected: "The articles disagree. One says Salesforce acquired Slack in 2021. The other says Salesforce acquired Slack in 2022.",
  },
  {
    id: "T-010",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce bought Slack in 2021." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-011",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce invested in Slack in 2021." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states which company acquired Slack.",
  },
  {
    id: "T-012",
    query: "Which company acquired Slak?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack in 2021." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-013",
    query: "Which company acquired Stack?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack in 2021." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states which company acquired Stack.",
  },
  {
    id: "T-014",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce never acquired Slack." },
      { name: "art-2", text: "Salesforce acquired Slack in 2021." },
    ],
    expected: "The articles disagree. One says Salesforce never acquired Slack. The other says Salesforce acquired Slack in 2021.",
  },
  {
    id: "T-015",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Slack now belongs to Salesforce." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-016",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Fans hope Slack will one day belong to Salesforce." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states which company acquired Slack.",
  },
  {
    id: "T-017",
    query: "When did Salesforce acquire Slack?",
    articles: [
      { name: "art-1", text: "Salesforce paid 20 billion for Slack." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states when Salesforce acquired Slack.",
  },
  {
    id: "T-018",
    query: "Who acquired Salesforce?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack in 2025." },
      { name: "art-2", text: "Salesforce acquired Tableau." },
    ],
    expected: "No article states who acquired Salesforce.",
  },
  {
    id: "T-019",
    query: "Which companies did Salesforce acquire?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack." },
      { name: "art-2", text: "Salesforce acquired Tableau." },
      { name: "art-3", text: "Salesforce acquired MuleSoft." },
    ],
    expected: "Salesforce acquired Slack, Tableau, and MuleSoft.",
  },
  {
    id: "T-020",
    query: "When did Salesforce acquire Slack?",
    articles: [
      { name: "art-1", text: "Salesforce announced its agreement to acquire Slack in December 2020." },
      { name: "art-2", text: "Salesforce completed its acquisition of Slack in July 2021." },
    ],
    expected: "Salesforce acquired Slack in July 2021.",
  },
  {
    id: "T-021",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce.com Inc. acquired Slack Technologies Inc." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-022",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Following the deal, Slack became a Salesforce-owned business." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "Salesforce acquired Slack.",
  },
  {
    id: "T-023",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "There is a speculation that Salesforce might acquire Slack someday." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states which company acquired Slack.",
  },
  {
    id: "T-024",
    query: "Which company acquired Slack?",
    articles: [
      { name: "art-1", text: "Salesforce did not acquire Slack." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states which company acquired Slack.",
  },
  {
    id: "T-025",
    query: "In which month did Salesforce acquire Slack?",
    articles: [
      { name: "art-1", text: "Salesforce acquired Slack in 2021." },
      { name: "art-2", text: "Zoom launched a new video product." },
    ],
    expected: "No article states in which month Salesforce acquired Slack.",
  },
  {
    id: "T-026",
    query: "Which company acquired Slack, and when was the deal completed?",
    articles: [
      { name: "art-1", text: "Salesforce is the acquiring company." },
      { name: "art-2", text: "The transaction was completed in July 2021." },
    ],
    expected: "No article states which company acquired Slack, and when the deal was completed.",
  },
  {
    id: "T-027",
    query: "Which database companies acquired AI startups and published vector-search papers?",
    articles: [
      { name: "art-1", text: "MongoDB acquired AI startup Voyage." },
      { name: "art-2", text: "MongoDB published a paper on vector search." },
    ],
    expected: "MongoDB acquired AI startup Voyage and published a paper on vector search.",
  },
  {
    id: "T-028",
    query: "Which database companies acquired AI startups and published vector-search papers?",
    articles: [
      { name: "art-1", text: "Database company MongoDB acquired AI startup Voyage in 2025." },
      { name: "art-2", text: "Elastic launched a new database product." },
    ],
    expected: "No article states which database companies acquired AI startups and published vector-search papers.",
  },
  {
    id: "T-029",
    query: "Which database companies acquired AI startups and published vector-search papers?",
    articles: [
      { name: "art-1", text: "OpenAI acquired AI startup Voyage." },
      { name: "art-2", text: "OpenAI published a paper on vector search." },
    ],
    expected: "No company is shown to meet both conditions.",
  },
  {
    id: "T-030",
    query: "Which database companies acquired AI startups and published vector-search papers?",
    articles: [
      { name: "art-1", text: "Database company MongoDB acquired AI startup Voyage." },
      { name: "art-2", text: "MongoDB published a paper on vector search." },
      { name: "art-3", text: "Database company Elastic acquired AI startup Nimbus." },
      { name: "art-4", text: "Elastic published a paper on vector search." },
    ],
    expected: "MongoDB and Elastic acquired AI startups and published vector-search papers.",
  },
  {
    id: "T-031",
    query: "Which database companies acquired AI startups and published vector-search papers?",
    articles: [
      { name: "art-1", text: "MongoDB acquired AI startup Voyage." },
      { name: "art-2", text: "MongoDB published a paper on query optimization." },
    ],
    expected: "No company is shown to meet both conditions.",
  },
  {
    id: "T-032",
    query: "Which database companies acquired AI startups and published vector-search papers?",
    articles: [
      { name: "art-1", text: "MongoDB acquired AI startup Voyage." },
      { name: "art-2", text: "Elastic published a paper on vector search." },
    ],
    expected: "No company is shown to meet both conditions.",
  },
];
