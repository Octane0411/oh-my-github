/**
 * LLM-Based Quality Evaluation
 *
 * Evaluates 3 dimensions using LLM analysis of README content:
 * 1. Documentation (0-10): README quality, completeness, clarity
 * 2. Ease of Use (0-10): API clarity, code examples, getting started guide
 * 3. Relevance (0-10): How well the repository matches user query intent
 *
 * Phase 4 implements single-repo evaluation.
 * Phase 5 adds parallel batch evaluation for performance.
 */

import pLimit from "p-limit";
import { createLLMClient, getModelName } from "../llm-config";
import type { Repository } from "../types";

/**
 * LLM Evaluation Result
 */
export interface LLMEvaluationResult {
  documentation: number;
  easeOfUse: number;
  relevance: number;
  reasoningText?: {
    documentation?: string;
    easeOfUse?: string;
    relevance?: string;
  };
}

/**
 * Evaluate repository quality using LLM
 *
 * @param repo - Repository metadata
 * @param readmeContent - README markdown content (first 4000 chars)
 * @param userQuery - Original user search query for relevance scoring
 * @returns Evaluation scores for 3 LLM-based dimensions
 */
export async function evaluateWithLLM(
  repo: Repository,
  readmeContent: string,
  userQuery: string
): Promise<LLMEvaluationResult> {
  const llm = createLLMClient();
  const modelName = getModelName();

  // Truncate README to first 4000 characters to stay within token limits
  const truncatedReadme = readmeContent.slice(0, 4000);

  const prompt = `You are a code quality analyst evaluating GitHub repositories. Analyze the following repository and provide scores (0-10) for three quality dimensions.

Repository: ${repo.full_name}
Description: ${repo.description || "No description"}
Language: ${repo.language || "Unknown"}
Stars: ${repo.stars.toLocaleString()}
User Query: "${userQuery}"

README Content (first 4000 chars):
---
${truncatedReadme}
---

Evaluate this repository on three dimensions (0-10 scale):

1. **Documentation Score (0-10)**:
   - 10: Comprehensive docs with clear examples, API reference, contributing guide
   - 7-9: Good README with installation, usage, API overview
   - 4-6: Basic README with minimal examples, missing some sections
   - 1-3: Sparse documentation, hard to understand
   - 0: No meaningful documentation

2. **Ease of Use Score (0-10)**:
   - 10: Crystal clear API, abundant examples, quick start guide, beginner-friendly
   - 7-9: Good examples, clear API design, reasonable learning curve
   - 4-6: Some examples, moderate complexity, average UX
   - 1-3: Poor examples, confusing API, steep learning curve
   - 0: No examples, extremely difficult to use

3. **Relevance Score (0-10)**:
   - 10: Perfect match for user query intent (solves exact problem)
   - 7-9: Strong match, addresses core need with minor gaps
   - 4-6: Moderate match, related but not ideal fit
   - 1-3: Weak match, tangentially related
   - 0: Not relevant to query at all

Provide your evaluation as JSON only (no markdown code blocks):
{
  "documentation": <score>,
  "ease_of_use": <score>,
  "relevance": <score>,
  "reasoning": {
    "documentation": "<brief explanation, max 100 chars>",
    "ease_of_use": "<brief explanation, max 100 chars>",
    "relevance": "<brief explanation, max 100 chars>"
  }
}`;

  try {
    const useJsonFormat = !process.env.DEEPSEEK_API_KEY;

    const response = await llm.chat.completions.create(
      {
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        ...(useJsonFormat && { response_format: { type: "json_object" as const } }),
      },
      { signal: AbortSignal.timeout(15000) }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty LLM response");
    }

    // Clean and parse JSON response
    const cleanedContent = cleanJSON(content);
    const parsed = JSON.parse(cleanedContent);

    // Validate and clamp scores
    const documentation = clampScore(parsed.documentation);
    const easeOfUse = clampScore(parsed.ease_of_use);
    const relevance = clampScore(parsed.relevance);

    return {
      documentation,
      easeOfUse,
      relevance,
      reasoningText: parsed.reasoningText,
    };
  } catch (error) {
    console.warn(
      `LLM evaluation failed for ${repo.full_name}:`,
      error instanceof Error ? error.message : String(error)
    );

    // Fallback to neutral scores (5.0) when LLM fails
    return {
      documentation: 5.0,
      easeOfUse: 5.0,
      relevance: 5.0,
    };
  }
}

/**
 * Clean JSON response from LLM
 *
 * Removes markdown code blocks and extra whitespace
 */
function cleanJSON(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Clamp score to valid range [0, 10] with 1 decimal precision
 */
function clampScore(score: number | undefined): number {
  if (score === undefined || isNaN(score)) {
    return 5.0; // Default neutral score
  }

  const clamped = Math.max(0, Math.min(10, score));
  return Math.round(clamped * 10) / 10;
}

/** Fallback scores used when LLM evaluation fails or README is missing */
const FALLBACK_SCORES: LLMEvaluationResult = {
  documentation: 5.0,
  easeOfUse: 5.0,
  relevance: 5.0,
};

/**
 * Evaluate multiple repositories in parallel with concurrency control
 *
 * Phase 5: Parallel batch evaluation for performance
 *
 * @param repos - Array of repositories to evaluate
 * @param readmeMap - Map of repo full_name to README content
 * @param userQuery - Original user search query
 * @param concurrency - Max concurrent LLM requests (default: 3)
 * @returns Map of repo full_name to evaluation results
 */
export async function batchEvaluateWithLLM(
  repos: Repository[],
  readmeMap: Map<string, string>,
  userQuery: string,
  concurrency: number = 3
): Promise<Map<string, LLMEvaluationResult>> {
  console.log(
    `\\n[LLM Batch Evaluation] ${repos.length} repos (concurrency: ${concurrency})...`
  );

  const limit = pLimit(concurrency);

  const evaluationPromises = repos.map((repo) =>
    limit(() => evaluateSingleRepo(repo, readmeMap.get(repo.full_name), userQuery))
  );

  const results = await Promise.all(evaluationPromises);

  const resultMap = new Map<string, LLMEvaluationResult>();
  for (const { repoName, result } of results) {
    resultMap.set(repoName, result);
  }

  console.log(`[LLM Batch Evaluation] Complete: ${results.length} repos evaluated`);
  return resultMap;
}

/**
 * Evaluate a single repository with error handling
 */
async function evaluateSingleRepo(
  repo: Repository,
  readme: string | undefined,
  userQuery: string
): Promise<{ repoName: string; result: LLMEvaluationResult }> {
  const repoName = repo.full_name;

  if (!readme) {
    console.warn(`  [WARN] No README for ${repoName}, using fallback scores`);
    return { repoName, result: FALLBACK_SCORES };
  }

  try {
    const result = await evaluateWithLLM(repo, readme, userQuery);
    console.log(
      `  [OK] ${repoName}: doc=${result.documentation}, ux=${result.easeOfUse}, rel=${result.relevance}`
    );
    return { repoName, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  [FAIL] ${repoName}: ${message}`);
    return { repoName, result: FALLBACK_SCORES };
  }
}
