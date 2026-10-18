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
      { name: "art-1", text: "Slack is now acquired by Salesforce." },
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
    expected: "MongoDB and Elastic.",
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
    {
    id: "T-033",
    query: "What was Nvidia's revenue in Q3 2024?",
    articles: [
      { name: "art-1", text: "Nvidia reported total company revenue of $35.1 billion in Q3 2024." },
      { name: "art-2", text: "Nvidia's Data Center division generated $30.8 billion in Q3 2024." },
    ],
    expected: "Nvidia's total revenue in Q3 2024 was $35.1 billion ($30.8 billion from Data Center).",
  },
  {
    id: "T-034",
    query: "When is Apple opening its new data center in Munich?",
    articles: [
      { name: "art-1", text: "Apple plans to build a $1 billion research facility in Munich by 2026." },
      { name: "art-2", text: "Apple opened a new data center in Frankfurt last year." },
    ],
    expected: "No article states when Apple is opening a data center in Munich.",
  },
  {
    id: "T-035",
    query: "Which CEO announced layoffs in 2025?",
    articles: [
      { name: "art-1", text: "In January 2025, CEO Sundar Pichai announced organizational restructuring at Google." },
      { name: "art-2", text: "Amazon CEO Andy Jassy announced 10,000 corporate layoffs in November 2024." },
    ],
    expected: "No article explicitly states that a CEO announced layoffs in 2025.",
  },
  {
    id: "T-036",
    query: "Who is the CEO of OpenAI?",
    articles: [
      { name: "art-1", text: "Sam Altman was reinstated as OpenAI CEO in November 2023." },
      { name: "art-2", text: "Mira Murati briefly served as interim CEO of OpenAI before stepping down in 2024." },
    ],
    expected: "Sam Altman.",
  },
  {
    id: "T-037",
    query: "What is the valuation of Databricks?",
    articles: [
      { name: "art-1", text: "Databricks is valued at $43 billion." },
      { name: "art-2", text: "Databricks builds data intelligence platforms." },
    ],
    expected: "Databricks is valued at $43 billion.",
  },
  {
    id: "T-038",
    query: "Which European fintechs acquired banking licenses in 2024?",
    articles: [
      { name: "art-1", text: "Revolut secured a full UK banking license in July 2024." },
      { name: "art-2", text: "Monzo obtained its UK banking license in 2017." },
      { name: "art-3", text: "Klarna secured its European banking license in Sweden back in 2017." },
    ],
    expected: "Revolut.",
  },
  {
    id: "T-039",
    query: "Did Microsoft acquire Discord?",
    articles: [
      { name: "art-1", text: "Microsoft was in talks to acquire Discord for $10 billion in 2021." },
      { name: "art-2", text: "Discord ended acquisition talks with Microsoft to remain independent." },
    ],
    expected: "No article states whether Microsoft acquired Discord.",
  },
  {
    id: "T-040",
    query: "Which EV companies expanded into Europe and launched a battery swapping service?",
    articles: [
      { name: "art-1", text: "NIO expanded sales to Europe in 2022." },
      { name: "art-2", text: "NIO launched its network of Power Swap stations across Europe." },
      { name: "art-3", text: "BYD expanded electric vehicle sales into Germany and Norway." },
    ],
    expected: "NIO.",
  },
  {
    id: "T-041",
    query: "What were Google's and Meta's capital expenditures in 2024?",
    articles: [
      { name: "art-1", text: "Alphabet reported Google capital expenditures of $50 billion in 2024." },
      { name: "art-2", text: "Meta reported capital expenditures of $38-$40 billion in 2024" },
    ],
    expected: "Google's capex was $50 billion, and Meta's capex was $38-$40 billion in 2024.",
  },
  {
    id: "T-042",
    query: "Who founded Anthropic?",
    articles: [
      { name: "art-1", text: "Former OpenAI executives Dario Amodei and Daniela Amodei founded Anthropic in 2021." },
      { name: "art-2", text: "Amazon invested $4 billion in AI startup Anthropic." },
    ],
    expected: "Dario Amodei and Daniela Amodei.",
  },
  {
    id: "T-043",
    query: "Which cloud provider experienced an outage in the US-East region in March?",
    articles: [
      { name: "art-1", text: "AWS reported a major service degradation in US-East-1 during October." },
      { name: "art-2", text: "Azure experienced cloud availability issues in Western Europe in March." },
    ],
    expected: "No article states which cloud provider experienced an outage in US-East in March.",
  },
  {
    id: "T-044",
    query: "What autonomous driving milestone did Waymo reach in 2024?",
    articles: [
      { name: "art-1", text: "Waymo surpassed 150,000 paid driverless trips per week in late 2024." },
      { name: "art-2", text: "Cruise resumed driverless testing with safety drivers in Phoenix." },
    ],
    expected: "Waymo surpassed 150,000 paid driverless trips per week in late 2024.",
  },
  {
    id: "T-045",
    query: "Which chipmakers build 2nm chips in Taiwan?",
    articles: [
      { name: "art-1", text: "TSMC began trial production of 2nm chips at its Hsinchu facility in Taiwan." },
      { name: "art-2", text: "Intel is building its 2nm-equivalent 18A process node in Ohio." },
      { name: "art-3", text: "Samsung manufactures 2nm chips in South Korea." },
    ],
    expected: "TSMC.",
  },
  {
    id: "T-046",
    query: "Did Tesla launch a Robotaxi service in California?",
    articles: [
      { name: "art-1", text: "Tesla unveile its Cybercab prototype at an event in Burbank, California." },
      { name: "art-2", text: "Tesla has not yet received a commercial deployment permit for autonomous rides from the California CPUC." },
    ],
    expected: "No article states whether Tesla launched a Robotaxi service in California.",
  },
  {
    id: "T-047",
    query: "Which open-source AI models support a 128k context window?",
    articles: [
      { name: "art-1", text: "Meta released the open-source Llama 3.1 with a native context window of up to 128k tokens." },
      { name: "art-2", text: "The open-source Mistral Large 2 supports context lengths up to 128k tokens." },
    ],
    expected: "Llama 3.1 and Mistral Large 2.",
  },
  {
    id: "T-048",
    query: "What causes the database connection timeouts in regional clusters?",
    articles: [
      { name: "art-1", text: "Regional database connection timeouts occur when connection pool exhaustion coincides with network latency spikes above 200ms." },
      { name: "art-2", text: "To resolve timeouts, increase max_connections in the postgresql.conf file." },
    ],
    expected: "Connection pool exhaustion coinciding with network latency spikes above 200ms.",
  },
  {
    id: "T-049",
    query: "Which companies were fined by European regulators for GDPR breaches in 2023?",
    articles: [
      { name: "art-1", text: "Meta was fined a record €1.2 billion by Ireland's DPC under GDPR in May 2023." },
      { name: "art-2", text: "TikTok was fined €345 million for GDPR privacy violations concerning children's data in September 2023." },
      { name: "art-3", text: "Amazon received a GDPR fine in 2021." },
    ],
    expected: "Meta was fined by a European regulator for GDPR breaches in 2023.",
  },
  {
    id: "T-050",
    query: "What is Apple's strategy for generative AI integration?",
    articles: [
      { name: "art-1", text: "Apple Intelligence integrates on-device models with Private Cloud Compute for complex tasks." },
      { name: "art-2", text: "Apple partnered with OpenAI to offer ChatGPT access through Siri." },
    ],
    expected: "Combining on-device models, Private Cloud Compute for heavy workloads, and external integrations like OpenAI's ChatGPT through Siri.",
  },
  {
    id: "T-051",
    query: "When did SpaceX complete the first successful landing of Starship's Super Heavy booster?",
    articles: [
      { name: "art-1", text: "SpaceX caught the Super Heavy booster back at the launch tower during Flight 5 in October 2024." },
      { name: "art-2", text: "SpaceX successfully landed Falcon 9 boosters over 300 times." },
    ],
    expected: "October 2024 (during Starship Flight 5).",
  },
  {
    id: "T-052",
    query: "Which streaming services increased their ad-free monthly subscription price in 2024?",
    articles: [
      { name: "art-1", text: "Max raised its monthly ad-free tier price by $1 to $16.99 in June 2024." },
      { name: "art-2", text: "Disney+ increased its ad-free plan price to $15.99 in October 2024." },
      { name: "art-3", text: "Netflix maintained its Standard tier price throughout 2024." },
    ],
    expected: "Max and Disney+.",
  },
  {
    id: "T-053",
    query: "Who leads the quantum computing hardware division at IBM?",
    articles: [
      { name: "art-1", text: "IBM Quantum is led by Vice President Jay Gambetta." },
      { name: "art-2", text: "Arvind Krishna serves as the Chairman and CEO of IBM." },
    ],
    expected: "Jay Gambetta.",
  },
  {
    id: "T-054",
    query: "What caused the IT outage in July 2024?",
    articles: [
      { name: "art-1", text: "In July 2024, a faulty CrowdStrike Falcon update triggered global crashes in Microsoft Windows systems." },
      { name: "art-2", text: "A separate BGP routing issue caused minor regional connectivity losses." },
    ],
    expected: "A faulty CrowdStrike Falcon update that crashed Windows systems.",
  },
  {
    id: "T-055",
    query: "Which pharmaceutical company acquired Prometheus Biosciences?",
    articles: [
      { name: "art-1", text: "Merck completed its acquisition of Prometheus Biosciences for $10.8 billion in 2023." },
      { name: "art-2", text: "Pfizer acquired Seagen for $43 billion." },
    ],
    expected: "Merck.",
  },
  {
    id: "T-056",
    query: "What is the battery range of the Rivian R1T Dual-Motor with the Max pack?",
    articles: [
     { name: "art-1", text: "The Rivian R1T Dual-Motor equipped with the Max pack delivers an EPA-estimated range of 410 miles." },
      { name: "art-2", text: "The Rivian R1S Quad-Motor has an estimated range of 321 miles with the Large pack." },
    ],
    expected: "410 miles.",
  },
  {
    id: "T-057",
    query: "Which social media platforms introduced paid subscription verification in 2023?",
    articles: [
      { name: "art-1", text: "Meta launched 'Meta Verified' paid verification for Instagram and Facebook accounts in early 2023." },
      { name: "art-2", text: "X (formerly Twitter) introduced Twitter Blue paid verification in late 2022." },
    ],
    expected: "Instagram and Facebook (via Meta Verified).",
  },
  {
    id: "T-058",
    query: "Which database companies recently acquired AI startups and also published papers on vector search?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "NorthstarDB published a research paper on vector search in 2025." },
      { name: "art-3", text: "Database company CedarSQL acquired AI startup ModelForge in 2024." },
      { name: "art-4", text: "CedarSQL published a paper on distributed query optimization in 2025." },
      { name: "art-5", text: "AtlasDB published a paper on vector search in 2025." },
    ],
    expected: "NorthstarDB.",
  },
  {
    id: "T-059",
    query: "Which database companies recently acquired AI startups and also published papers on vector search?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "NorthstarDB published a paper on distributed query optimization in 2025." },
      { name: "art-3", text: "Database company CedarSQL published a paper on vector search in 2025." },
      { name: "art-4", text: "CedarSQL launched a new SQL analytics engine in 2025." },
    ],
    expected: "No company is shown to meet both conditions.",
  },
  {
    id: "T-060",
    query: "Which database companies acquired AI startups and published vector-search research in 2025?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "AI company NeuralWorks published a vector-search research paper in 2025." },
      { name: "art-3", text: "Database company CedarSQL acquired AI startup ModelForge in 2025." },
      { name: "art-4", text: "CedarSQL published a vector-search research paper in 2025." },
    ],
    expected: "CedarSQL.",
  },
  {
    id: "T-061",
    query: "Which database companies bought AI startups and released vector-search research papers in 2025?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB purchased AI startup QueryPilot in February 2025." },
      { name: "art-2", text: "NorthstarDB released a research paper about vector search in September 2025." },
      { name: "art-3", text: "Database company CedarSQL partnered with AI startup ModelForge in 2025." },
      { name: "art-4", text: "CedarSQL published a vector-search research paper in 2025." },
    ],
    expected: "NorthstarDB.",
  },
  {
    id: "T-062",
    query: "Which database companies acquired AI startups in 2024 or 2025 and published papers on vector search?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB acquired AI startup QueryPilot in 2023." },
      { name: "art-2", text: "NorthstarDB published a paper on vector search in 2025." },
      { name: "art-3", text: "Database company CedarSQL acquired AI startup ModelForge in 2024." },
      { name: "art-4", text: "CedarSQL published a paper on vector search in 2024." },
      { name: "art-5", text: "Database company AtlasDB acquired AI startup IndexMind in 2025." },
    ],
    expected: "CedarSQL.",
  },
  {
    id: "T-063",
    query: "Which database companies acquired AI startups and published papers on vector search?",
    articles: [
      { name: "art-1", text: "Northstar Database Systems, also known as NorthstarDB, acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "NorthstarDB published a paper on vector search in 2025." },
      { name: "art-3", text: "CedarSQL acquired AI startup ModelForge in 2025." },
      { name: "art-4", text: "AtlasDB published a paper on vector search in 2025." },
    ],
    expected: "NorthstarDB.",
  },
  {
    id: "T-064",
    query: "Which database companies acquired AI startups and published papers on vector search?",
    articles: [
      { name: "art-1", text: "AI startup QueryPilot acquired database company NorthstarDB in 2025." },
      { name: "art-2", text: "NorthstarDB published a paper on vector search in 2025." },
      { name: "art-3", text: "Database company CedarSQL acquired AI startup ModelForge in 2025." },
      { name: "art-4", text: "CedarSQL published a paper on vector search in 2025." },
    ],
    expected: "CedarSQL.",
  },
  {
    id: "T-065",
    query: "Which database companies acquired AI startups and published papers on vector search?",
    articles: [
      { name: "art-1", text: "NorthstarDB considered acquiring AI startup QueryPilot, but the deal was never completed." },
      { name: "art-2", text: "NorthstarDB published a paper on vector search in 2025." },
      { name: "art-3", text: "Database company CedarSQL acquired AI startup ModelForge in 2025." },
      { name: "art-4", text: "CedarSQL published a paper on vector search in 2025." },
    ],
    expected: "CedarSQL.",
  },
  {
    id: "T-066",
    query: "Which database companies acquired AI startups in 2025 and published vector-search papers in 2024?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "NorthstarDB published a vector-search research paper in 2024." },
      { name: "art-3", text: "Database company CedarSQL acquired AI startup ModelForge in 2024." },
      { name: "art-4", text: "CedarSQL published a vector-search research paper in 2024." },
      { name: "art-5", text: "Database company AtlasDB acquired AI startup IndexMind in 2025." },
      { name: "art-6", text: "AtlasDB published a vector-search research paper in 2025." },
    ],
    expected: "NorthstarDB.",
  },
  {
    id: "T-067",
    query: "Which database companies acquired AI startups, published vector-search papers, and open-sourced their vector indexing technology?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "NorthstarDB published a paper on vector search in 2025." },
      { name: "art-3", text: "NorthstarDB open-sourced its vector indexing library in 2025." },
      { name: "art-4", text: "Database company CedarSQL acquired AI startup ModelForge in 2025." },
      { name: "art-5", text: "CedarSQL published a paper on vector search in 2025." },
      { name: "art-6", text: "CedarSQL's vector indexing library remains proprietary." },
      { name: "art-7", text: "AtlasDB open-sourced its vector indexing library in 2025." },
    ],
    expected: "NorthstarDB.",
  },
  {
    id: "T-068",
    query: "Which database companies acquired AI startups and published research papers on vector search?",
    articles: [
      { name: "art-1", text: "Database company NorthstarDB acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "NorthstarDB launched a vector-search feature in its database product in 2025." },
      { name: "art-3", text: "Database company CedarSQL acquired AI startup ModelForge in 2025." },
      { name: "art-4", text: "CedarSQL published an academic research paper on vector search in 2025." },
    ],
    expected: "CedarSQL.",
  },
  {
    id: "T-069",
    query: "Which database companies acquired AI startups and published papers on vector search?",
    articles: [
      { name: "art-1", text: "AI company NeuralWorks acquired AI startup QueryPilot in 2025." },
      { name: "art-2", text: "NeuralWorks published a paper on vector search in 2025." },
      { name: "art-3", text: "Database company NorthstarDB acquired AI startup ModelForge in 2025." },
      { name: "art-4", text: "NorthstarDB published a paper on vector search in 2025." },
      { name: "art-5", text: "Cloud provider SkyCompute acquired database company AtlasDB in 2025." },
      { name: "art-6", text: "AtlasDB published a paper on vector search in 2025." },
    ],
    expected: "NorthstarDB.",
  },
];
