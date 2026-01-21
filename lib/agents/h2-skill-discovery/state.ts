import { Annotation } from '@langchain/langgraph';

export interface Repository {
  full_name: string;
  description: string | null;
  stars: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  html_url: string;
  default_branch: string;
  archived: boolean;
  fork: boolean;
}

export interface ACSScore {
  total: number; // 0-100
  breakdown: {
    interface_clarity: number; // 0-30
    documentation: number; // 0-30
    environment: number; // 0-20
    token_economy: number; // 0-20
  };
  recommendation: "HIGHLY_RECOMMENDED" | "POSSIBLE" | "NOT_RECOMMENDED";
  skill_strategy: "CLI_WRAPPER" | "PYTHON_SCRIPT" | "API_CALL" | "MANUAL_REQUIRED";
}

export interface ScoredRepository {
  repo: Repository;
  acsScore: ACSScore;
  reasoning: string;
}

export interface SearchParams {
  keywords: string[];
  expanded_keywords: string[];
  search_strategies: {
    primary: string;
    toolFocused: string;
    ecosystemFocused: string;
  };
}

export const H2DiscoveryAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>,
  language: Annotation<string | undefined>,
  toolType: Annotation<"cli" | "library" | "api-wrapper" | "any" | undefined>,

  // Intermediate
  searchParams: Annotation<SearchParams | undefined>,
  rawCandidates: Annotation<Repository[]>,

  // Output
  scoredRepositories: Annotation<ScoredRepository[]>,

  // Metadata
  stage: Annotation<"translating" | "scouting" | "screening" | "complete">,
  errors: Annotation<string[]>,
  costTracking: Annotation<{
    llmCalls: number;
    tokensUsed: number;
    estimatedCost: number;
  }>
});

export type H2DiscoveryState = typeof H2DiscoveryAnnotation.State;
