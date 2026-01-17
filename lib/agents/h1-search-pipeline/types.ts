/**
 * Type definitions for the Horizon 1 Search Pipeline
 *
 * This file contains all TypeScript interfaces and types used across
 * the Query Translator, Scout, and Screener agents.
 */

import type { Endpoints } from "@octokit/types";

/**
 * GitHub Repository type from Octokit search results
 */
export type GitHubRepository = Endpoints["GET /repos/{owner}/{repo}"]["response"]["data"];

/**
 * Search modes determine keyword expansion strategy
 * - focused: Exact match, no expansion
 * - balanced: 2-3 synonym expansions (default)
 * - exploratory: 5-8 semantic term expansions
 */
export type SearchMode = "focused" | "balanced" | "exploratory";

/**
 * Structured search parameters extracted from user query
 */
export interface SearchParams {
  /** Primary keywords extracted from query */
  keywords: string[];

  /** LLM-generated semantic expansion based on searchMode */
  expanded_keywords: string[];

  /** Programming language (optional) */
  language?: string;

  /** Star range inferred from user query (independent of searchMode) */
  starRange?: {
    min?: number;
    max?: number;
  };

  /** Created after date (for "new" or "recent" queries) */
  createdAfter?: Date;

  /** GitHub topics */
  topics?: string[];
}

/**
 * Repository candidate from Scout agent
 */
export interface Repository {
  full_name: string;
  name: string;
  owner: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  has_readme: boolean;
  is_archived: boolean;
  is_fork: boolean;
  license: string | null;
  open_issues_count: number;
  default_branch: string;
  html_url: string;
}

/**
 * Multi-dimensional scores for a repository (0-10 scale)
 */
export interface DimensionScores {
  /** Maturity: age + stars + releases */
  maturity: number;

  /** Activity: recent commits + issue/PR velocity */
  activity: number;

  /** Documentation: README quality + wiki presence (LLM-based) */
  documentation: number;

  /** Community: contributors + stars/fork ratio */
  community: number;

  /** Ease of Use: README clarity + examples (LLM-based) */
  easeOfUse: number;

  /** Maintenance: recent release + issue response time */
  maintenance: number;

  /** Relevance: how well the repo matches the user query (LLM-based) */
  relevance: number;

  /** Overall weighted score */
  overall: number;
}

/**
 * Repository with calculated scores
 */
export interface ScoredRepository extends Repository {
  scores: DimensionScores;

  /** Data for radar chart visualization */
  radarChartData: Array<{
    dimension: string;
    score: number;
  }>;

  /** LLM reasoning for scores (optional, for debugging) */
  reasoning?: string;
}

/**
 * Error information for a pipeline stage
 */
export interface PipelineError {
  stage: string;
  error: Error;
  timestamp: Date;
}

/**
 * Execution time tracking for each stage
 */
export interface ExecutionTime {
  queryTranslator?: number;
  scout?: number;
  screenerStage1?: number;
  screenerStage2?: number;
  total?: number;
}

/**
 * Global state for the LangGraph search pipeline
 *
 * State flows through: Query Translator → Scout → Screener → Output
 */
export interface SearchPipelineState {
  // ===== Input =====
  /** User's natural language query */
  userQuery: string;

  /** Search mode (affects keyword expansion) */
  searchMode: SearchMode;

  // ===== Query Translator Output =====
  /** Structured search parameters */
  searchParams?: SearchParams;

  // ===== Scout Output =====
  /** 50-100 candidate repositories from multi-strategy search */
  candidateRepos?: Repository[];

  // ===== Screener Stage 1 Output =====
  /** ~25 repositories after rule-based coarse filtering */
  coarseFilteredRepos?: Repository[];

  // ===== Screener Stage 2 Output (Final) =====
  /** Top 10 repositories with multi-dimensional scores */
  topRepos?: ScoredRepository[];

  // ===== Metadata =====
  /** Execution time tracking */
  executionTime: ExecutionTime;

  /** Errors accumulated during pipeline execution */
  errors: PipelineError[];

  /** Warning flags (e.g., LLM scoring unavailable) */
  warnings?: string[];

  /** Whether results are from cache */
  cached?: boolean;
}

/**
 * Configuration constants for the pipeline
 */
export const CONFIG = {
  // Star range inference constants
  DEFAULT_MIN_STARS: 50,
  POPULAR_MIN_STARS: 1000,
  MATURE_MIN_STARS: 5000,
  EMERGING_MIN_STARS: 10,
  EMERGING_MAX_STARS: 1000,

  // Coarse filter thresholds
  COARSE_FILTER: {
    MIN_STARS: 50,
    MAX_AGE_YEARS: 5,
    UPDATED_WITHIN_MONTHS: 12,
    REQUIRE_README: true,
  },

  // Scout targets
  SCOUT: {
    MIN_CANDIDATES: 50,
    MAX_CANDIDATES: 100,
    RESULTS_PER_STRATEGY: 30,
    // Star range adjustments for different strategies
    RECENCY_STAR_DIVISOR: 3, // Divide min stars by this for recency strategy
    EXPANDED_STAR_DIVISOR: 5, // Divide min stars by this for expanded strategy
    RECENCY_MIN_FLOOR: 10,    // Minimum star threshold for recency strategy
    EXPANDED_MIN_FLOOR: 5,     // Minimum star threshold for expanded strategy
  },

  // Screener targets
  SCREENER: {
    COARSE_FILTER_TARGET: 25,
    FINAL_RESULTS_COUNT: 10,
  },

  // LLM configuration
  LLM: {
    QUERY_TRANSLATOR_TIMEOUT_MS: 5000,
    FINE_SCORER_TIMEOUT_MS: 8000,
    CONCURRENCY_LIMIT: 10,
    README_PREVIEW_CHARS: 500,
  },

  // Cache configuration
  CACHE: {
    TTL_MINUTES: 15,
  },

  // Score weights for overall calculation
  SCORE_WEIGHTS: {
    maturity: 0.15,
    activity: 0.25,
    documentation: 0.20,
    community: 0.15,
    easeOfUse: 0.15,
    maintenance: 0.10,
    relevance: 0.20,
  },
} as const;
