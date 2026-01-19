/**
 * Context Compression Utility
 *
 * Compresses large content (README, issues, commits, code) using LLM summarization
 * to fit within context windows while preserving key information.
 *
 * Strategy:
 * - README > 2000 chars → Summarize key features, installation, usage
 * - Issues > 20 items → Extract top 5 most relevant
 * - File trees > 100 files → Show top-level only
 * - Code > 500 lines → Extract key functions
 *
 * Falls back to simple truncation on LLM error/timeout.
 */

import { createLLMClient, callLLMWithTimeout } from "../h1-search-pipeline/llm-config";
import type { CompressionOptions } from "./types";

/**
 * Default compression thresholds
 */
const DEFAULT_THRESHOLDS = {
  readme: 2000,
  issues: 20,
  commits: 20,
  code: 500,
  fileTree: 100,
};

/**
 * Compression system prompts for different content types
 */
const COMPRESSION_PROMPTS = {
  readme: `Summarize this README file, preserving:
- Key features and capabilities
- Installation/setup instructions
- Basic usage examples
- Important warnings or requirements

Keep the summary under 500 words. Focus on what users need to know.`,

  issues: `Summarize these GitHub issues, extracting:
- Common themes or patterns
- Critical bugs or feature requests
- Most active discussions

Keep the summary concise (under 300 words).`,

  commits: `Summarize these recent commits, highlighting:
- Major features added
- Important bug fixes
- Breaking changes
- Overall development velocity

Keep the summary brief (under 200 words).`,

  code: `Summarize this code, describing:
- Main purpose and functionality
- Key functions or classes
- Notable patterns or techniques
- Potential concerns or limitations

Keep the summary concise (under 300 words).`,
};

/**
 * Compress content using LLM summarization
 *
 * @param content - Content to compress
 * @param options - Compression options
 * @returns Compressed content
 */
export async function compressContent(
  content: string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxChars = DEFAULT_THRESHOLDS.readme,
    contentType = "readme",
  } = options;

  // If content is already short enough, return as-is
  if (content.length <= maxChars) {
    return content;
  }

  const startTime = Date.now();

  try {
    // Get compression prompt for content type
    const systemPrompt = COMPRESSION_PROMPTS[contentType] || COMPRESSION_PROMPTS.readme;

    // Create LLM client
    const client = createLLMClient();

    // Truncate input to fit in LLM context (max 8000 chars for input)
    const truncatedInput = content.slice(0, 8000);

    console.log("[Context Compression] Compressing content...", {
      contentType,
      inputLength: content.length,
      truncatedLength: truncatedInput.length,
      maxChars,
    });

    // Call LLM with timeout
    const summary = await callLLMWithTimeout(
      client,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: truncatedInput },
      ],
      5000 // 5 second timeout
    );

    // Log compression stats
    const latency = Date.now() - startTime;
    const compressionRatio = (summary.length / content.length * 100).toFixed(1);

    console.log("[Context Compression] Compression complete", {
      contentType,
      inputLength: content.length,
      outputLength: summary.length,
      compressionRatio: `${compressionRatio}%`,
      latency: `${latency}ms`,
    });

    return summary;
  } catch (error) {
    // Log error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Context Compression] Error:", {
      contentType,
      error: errorMessage,
    });

    // Fallback to simple truncation
    const truncated = content.slice(0, maxChars);
    const ellipsis = "\n\n... (content truncated due to length)";

    return truncated + ellipsis;
  }
}

/**
 * Compress multiple content items in parallel
 *
 * @param items - Array of content items to compress
 * @param options - Compression options
 * @returns Array of compressed content
 */
export async function compressMultiple(
  items: Array<{ content: string; options?: CompressionOptions }>,
  concurrencyLimit = 5
): Promise<string[]> {
  const results: string[] = [];

  // Process in batches to avoid overwhelming the LLM API
  for (let i = 0; i < items.length; i += concurrencyLimit) {
    const batch = items.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(({ content, options }) => compressContent(content, options))
    );
    results.push(...batchResults);
  }

  return results;
}
