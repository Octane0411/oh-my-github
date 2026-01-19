/**
 * Fine Scoring (Stage 2)
 *
 * Performs detailed scoring on coarse-filtered repositories:
 * 1. Fetch README content for each repository
 * 2. Calculate metadata-based scores (Maturity, Activity, Community, Maintenance)
 * 3. Evaluate LLM-based scores (Documentation, Ease of Use, Relevance)
 * 4. Compute weighted overall score
 * 5. Sort by overall score and return Top 10
 */

import type { Repository, ScoredRepository, DimensionScores } from "../types";
import {
  calculateMetadataScores,
  calculateOverallScore,
  batchEvaluateWithLLM,
  type LLMEvaluationResult,
} from "../scoring";

/**
 * Fetch README content for a repository
 *
 * Uses GitHub API to get README content.
 * Falls back to empty string if README unavailable.
 *
 * @param repo - Repository to fetch README for
 * @returns README markdown content
 */
async function fetchReadme(repo: Repository): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("No GITHUB_TOKEN found, READMEs may be rate-limited");
    return "";
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo.full_name}/readme`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.raw+json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`  README not found for ${repo.full_name}`);
        return "";
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    console.warn(
      `Failed to fetch README for ${repo.full_name}:`,
      error instanceof Error ? error.message : String(error)
    );
    return "";
  }
}

/**
 * Batch fetch READMEs for multiple repositories
 *
 * @param repos - Repositories to fetch READMEs for
 * @returns Map of repo full_name to README content
 */
async function batchFetchReadmes(
  repos: Repository[]
): Promise<Map<string, string>> {
  console.log(`\\n📖 Fetching READMEs for ${repos.length} repositories...`);

  const readmePromises = repos.map(async (repo) => {
    const readme = await fetchReadme(repo);
    return { repo: repo.full_name, readme };
  });

  const results = await Promise.all(readmePromises);

  const readmeMap = new Map<string, string>();
  for (const { repo, readme } of results) {
    readmeMap.set(repo, readme);
  }

  const successCount = Array.from(readmeMap.values()).filter(
    (r) => r.length > 0
  ).length;
  console.log(`✅ READMEs fetched: ${successCount}/${repos.length} successful`);

  return readmeMap;
}

/** Default score used when metadata or LLM scores are unavailable */
const DEFAULT_SCORE = 5.0;

/**
 * Apply fine scoring to coarse-filtered repositories
 *
 * @param repos - Coarse-filtered repositories (~25 repos)
 * @param userQuery - Original user query for relevance scoring
 * @returns Top 10 scored repositories
 */
export async function applyFineScoring(
  repos: Repository[],
  userQuery: string
): Promise<ScoredRepository[]> {
  console.log(`\\n[Screener Stage 2] Fine scoring ${repos.length} repositories...`);

  const readmeMap = await batchFetchReadmes(repos);
  const metadataScoresMap = calculateAllMetadataScores(repos);
  const llmScoresMap = await batchEvaluateWithLLM(repos, readmeMap, userQuery, 3);

  console.log(`\\n[Computing] Overall scores...`);
  const scoredRepos = repos.map((repo) =>
    buildScoredRepository(
      repo,
      metadataScoresMap.get(repo.full_name),
      llmScoresMap.get(repo.full_name)
    )
  );

  const topRepos = scoredRepos
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .slice(0, 10);

  logTopRepos(topRepos);
  return topRepos;
}

/**
 * Calculate metadata scores for all repositories
 */
function calculateAllMetadataScores(
  repos: Repository[]
): Map<string, Partial<DimensionScores>> {
  console.log(`\\n[Computing] Metadata scores...`);
  const scoresMap = new Map<string, Partial<DimensionScores>>();
  for (const repo of repos) {
    scoresMap.set(repo.full_name, calculateMetadataScores(repo));
  }
  return scoresMap;
}

/**
 * Build a ScoredRepository from metadata and LLM scores
 */
function buildScoredRepository(
  repo: Repository,
  metadataScores: Partial<DimensionScores> | undefined,
  llmScores: LLMEvaluationResult | undefined
): ScoredRepository {
  const scores: Omit<DimensionScores, "overall"> = {
    maturity: metadataScores?.maturity ?? DEFAULT_SCORE,
    activity: metadataScores?.activity ?? DEFAULT_SCORE,
    community: metadataScores?.community ?? DEFAULT_SCORE,
    maintenance: metadataScores?.maintenance ?? DEFAULT_SCORE,
    documentation: llmScores?.documentation ?? DEFAULT_SCORE,
    easeOfUse: llmScores?.easeOfUse ?? DEFAULT_SCORE,
    relevance: llmScores?.relevance ?? DEFAULT_SCORE,
  };

  const overall = calculateOverallScore(scores);

  return {
    ...repo,
    scores: { ...scores, overall },
    radarChartData: buildRadarChartData(scores),
  };
}

/**
 * Build radar chart data from dimension scores
 */
function buildRadarChartData(
  scores: Omit<DimensionScores, "overall">
): Array<{ dimension: string; score: number }> {
  return [
    { dimension: "Maturity", score: scores.maturity },
    { dimension: "Activity", score: scores.activity },
    { dimension: "Community", score: scores.community },
    { dimension: "Maintenance", score: scores.maintenance },
    { dimension: "Documentation", score: scores.documentation },
    { dimension: "Ease of Use", score: scores.easeOfUse },
    { dimension: "Relevance", score: scores.relevance },
  ];
}

/**
 * Log top repositories summary
 */
function logTopRepos(repos: ScoredRepository[]): void {
  console.log(`\\n[Fine Scoring] Complete. Top ${repos.length} repositories:`);
  repos.forEach((repo, idx) => {
    console.log(`  ${idx + 1}. ${repo.full_name} (overall: ${repo.scores.overall}/10)`);
  });
}
