/**
 * Screener Node
 *
 * Evaluates repositories with ACS scoring and ranks them
 */

import { H2DiscoveryState, ScoredRepository } from "../state";
import { createGitHubClient } from "../scout/strategies";
import { fetchRepositoryContext } from "./context-fetcher";
import { evaluateRepository } from "./acs-evaluator";
import { trackLLMCost } from "../cost-tracking";

/**
 * Batch size for parallel evaluations
 */
const BATCH_SIZE = 10;

/**
 * Minimum ACS score threshold
 */
const MIN_SCORE_THRESHOLD = 40;

/**
 * Process repositories in batches
 */
async function processBatch(
  repos: H2DiscoveryState["rawCandidates"],
  startIdx: number,
  endIdx: number
): Promise<ScoredRepository[]> {
  const octokit = createGitHubClient();
  const batch = repos.slice(startIdx, endIdx);

  const results = await Promise.all(
    batch.map(async (repo) => {
      try {
        // Fetch context
        const context = await fetchRepositoryContext(octokit, repo);

        // Evaluate with ACS
        const { acsScore, reasoning } = await evaluateRepository(repo, context);

        return {
          repo,
          acsScore,
          reasoning,
        };
      } catch (error) {
        console.error(`Failed to evaluate ${repo.full_name}:`, error);
        // Return with default score
        return {
          repo,
          acsScore: {
            total: 40,
            breakdown: {
              interface_clarity: 12,
              documentation: 12,
              environment: 8,
              token_economy: 8,
            },
            recommendation: "NOT_RECOMMENDED" as const,
            skill_strategy: "MANUAL_REQUIRED" as const,
          },
          reasoning: `Evaluation failed: ${(error as Error).message}`,
        };
      }
    })
  );

  return results;
}

/**
 * Screener LangGraph Node
 */
export async function screenerNode(
  state: H2DiscoveryState
): Promise<Partial<H2DiscoveryState>> {
  const repos = state.rawCandidates || [];

  if (repos.length === 0) {
    return {
      stage: "complete",
      scoredRepositories: [],
      errors: [...(state.errors || []), "Screener: No repositories to evaluate"],
    };
  }

  try {
    console.log(`📊 Evaluating ${repos.length} repositories with ACS...`);

    // Process in batches
    const allScored: ScoredRepository[] = [];
    const numBatches = Math.ceil(repos.length / BATCH_SIZE);

    for (let i = 0; i < numBatches; i++) {
      const startIdx = i * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, repos.length);

      console.log(`  Processing batch ${i + 1}/${numBatches} (${startIdx}-${endIdx - 1})...`);

      const batchResults = await processBatch(repos, startIdx, endIdx);
      allScored.push(...batchResults);
    }

    // Filter by minimum score
    const filtered = allScored.filter((scored) => scored.acsScore.total >= MIN_SCORE_THRESHOLD);

    // Sort by total score (descending)
    const sorted = filtered.sort((a, b) => b.acsScore.total - a.acsScore.total);

    // Take top 10
    const top10 = sorted.slice(0, 10);

    console.log(`  Evaluated: ${allScored.length} repos`);
    console.log(`  Above threshold (${MIN_SCORE_THRESHOLD}): ${filtered.length} repos`);
    console.log(`  Top 10 selected`);

    // Track cost (rough estimate)
    const totalEvaluations = allScored.length;
    const estimatedInputTokens = totalEvaluations * 1000; // ~1000 tokens per evaluation
    const estimatedOutputTokens = totalEvaluations * 200; // ~200 tokens per output
    const cost = trackLLMCost("deepseek-chat", estimatedInputTokens, estimatedOutputTokens);

    return {
      scoredRepositories: top10,
      stage: "complete",
      costTracking: {
        llmCalls: (state.costTracking?.llmCalls || 0) + totalEvaluations,
        tokensUsed:
          (state.costTracking?.tokensUsed || 0) +
          estimatedInputTokens +
          estimatedOutputTokens,
        estimatedCost: (state.costTracking?.estimatedCost || 0) + cost,
      },
    };
  } catch (error) {
    console.error("Screener error:", error);

    return {
      stage: "complete",
      scoredRepositories: [],
      errors: [...(state.errors || []), `Screener failed: ${(error as Error).message}`],
    };
  }
}
