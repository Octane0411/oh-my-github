/**
 * Synthesizer Node
 *
 * Final node in the coordinator workflow.
 * Validates structured data, generates Markdown summary, and creates follow-up suggestions.
 *
 * Flow:
 * 1. Validate structuredData against Union Type schema
 * 2. Generate human-readable Markdown summary based on data type
 * 3. Create contextual follow-up suggestions
 * 4. Append assistant message to state
 */

import { AIMessage } from "@langchain/core/messages";
import type { AgentStateType } from "./state";
import type { StructuredData, Suggestion } from "./types";

/**
 * Synthesizer node function
 *
 * @param state - Current agent state
 * @returns Partial state update with assistant message and suggestions
 */
export async function synthesizerNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();

  try {
    const { structuredData, intent, conversationId } = state;

    console.log("[Synthesizer] Generating summary...", {
      conversationId,
      intent,
      dataType: structuredData?.type || "null",
    });

    // Validate structured data
    if (!structuredData) {
      throw new Error("No structured data to synthesize");
    }

    // Generate summary based on data type
    const summary = generateSummary(structuredData);

    // Generate follow-up suggestions
    const suggestions = generateSuggestions(structuredData);

    // Log synthesis
    const latency = Date.now() - startTime;
    console.log("[Synthesizer] Synthesis complete", {
      conversationId,
      summaryLength: summary.length,
      suggestionsCount: suggestions.length,
      latency: `${latency}ms`,
    });

    // Create assistant message
    const assistantMessage = new AIMessage({
      content: summary,
      additional_kwargs: {
        structuredData,
        suggestions,
      },
    });

    // Update state
    return {
      messages: [...(state.messages || []), assistantMessage],
      suggestions,
      metadata: {
        ...state.metadata,
        synthesizerLatency: latency,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Synthesizer] Error:", {
      conversationId: state.conversationId,
      error: errorMessage,
    });

    // Return error message
    const errorMsg = new AIMessage({
      content: `I encountered an error while processing your request: ${errorMessage}. Please try again or rephrase your question.`,
    });

    return {
      messages: [...(state.messages || []), errorMsg],
      error: errorMessage,
    };
  }
}

/**
 * Generate Markdown summary based on structured data type
 */
function generateSummary(data: StructuredData): string {
  if (!data) {
    return "No results found.";
  }

  switch (data.type) {
    case "repo_list":
      return generateRepoListSummary(data);

    case "repo_detail":
      return generateRepoDetailSummary(data);

    case "comparison":
      return generateComparisonSummary(data);

    case "clarification":
      return generateClarificationSummary(data);

    default:
      return "I'm not sure how to present these results.";
  }
}

/**
 * Generate summary for repository list
 */
function generateRepoListSummary(data: Extract<StructuredData, { type: "repo_list" }>): string {
  const { items, totalCandidates } = data;

  if (items.length === 0) {
    return "No repositories found matching your criteria. Try rephrasing your query or using different keywords.";
  }

  const intro = `I found **${items.length} repositories** that match your search${totalCandidates ? ` (from ${totalCandidates} candidates)` : ""}:\n\n`;

  const repoList = items.slice(0, 10).map((repo, index) => {
    const { full_name, description, stars, scores } = repo;
    const overallScore = scores.overall.toFixed(1);

    return `### ${index + 1}. [${full_name}](${repo.html_url}) ⭐ ${stars.toLocaleString()}

${description || "_No description available_"}

**Overall Score:** ${overallScore}/10 | **Language:** ${repo.language || "N/A"}

**Key Strengths:**
- **Maturity:** ${scores.maturity.toFixed(1)}/10
- **Activity:** ${scores.activity.toFixed(1)}/10
- **Documentation:** ${scores.documentation.toFixed(1)}/10
- **Community:** ${scores.community.toFixed(1)}/10
`;
  }).join("\n");

  const topRated = items[0];
  const mostStars = items.reduce((max, r) => r.stars > max.stars ? r : max);
  const mostActive = items.reduce((max, r) => r.scores.activity > max.scores.activity ? r : max);

  const insights = `\n---\n\n**Key Insights:**
- Top rated repo: **${topRated?.full_name}** (${topRated?.scores.overall.toFixed(1)}/10)
- Most stars: **${mostStars.full_name}** (${mostStars.stars.toLocaleString()} ⭐)
- Most active: **${mostActive.full_name}** (${mostActive.scores.activity.toFixed(1)}/10 activity)
`;

  return intro + repoList + insights;
}

/**
 * Generate summary for repository detail
 */
function generateRepoDetailSummary(data: Extract<StructuredData, { type: "repo_detail" }>): string {
  const { repo, analysis } = data;

  return `# ${repo.full_name}

${analysis}

**Repository Metrics:**
- ⭐ Stars: ${repo.stars.toLocaleString()}
- 🍴 Forks: ${repo.forks.toLocaleString()}
- 📝 Open Issues: ${repo.open_issues_count}
- 📅 Last Updated: ${new Date(repo.updated_at).toLocaleDateString()}

**Quality Scores:**
${Object.entries(repo.scores)
  .filter(([key]) => key !== "overall")
  .map(([key, value]) => `- **${key.charAt(0).toUpperCase() + key.slice(1)}:** ${(value as number).toFixed(1)}/10`)
  .join("\n")}

**Overall Score:** ${repo.scores.overall.toFixed(1)}/10
`;
}

/**
 * Generate summary for comparison
 */
function generateComparisonSummary(data: Extract<StructuredData, { type: "comparison" }>): string {
  const { items, winner, summary } = data;

  const intro = `# Repository Comparison\n\n${summary}\n\n`;

  const comparisons = items.map((item, index) => {
    const { repo, highlights, warnings, assessment } = item;

    return `## ${index + 1}. ${repo.full_name} ${winner === repo.full_name ? "🏆" : ""}

${assessment}

**Highlights:**
${highlights.map(h => `- ✅ ${h}`).join("\n")}

**Considerations:**
${warnings.map(w => `- ⚠️ ${w}`).join("\n")}

**Overall Score:** ${repo.scores.overall.toFixed(1)}/10
`;
  }).join("\n---\n\n");

  const recommendation = winner
    ? `\n\n**Recommendation:** ${winner} appears to be the best choice overall.`
    : "";

  return intro + comparisons + recommendation;
}

/**
 * Generate summary for clarification
 */
function generateClarificationSummary(data: Extract<StructuredData, { type: "clarification" }>): string {
  const { question, options, context } = data;

  const contextSection = context ? `${context}\n\n` : "";

  const optionsList = options.map((opt, index) => `${index + 1}. ${opt}`).join("\n");

  return `${contextSection}**${question}**\n\n${optionsList}\n\nYou can also type your own response.`;
}

/**
 * Generate contextual follow-up suggestions
 */
function generateSuggestions(data: StructuredData): Suggestion[] {
  if (!data) {
    return [];
  }

  switch (data.type) {
    case "repo_list": {
      const suggestions: Suggestion[] = [
        { text: "Analyze the top result in detail", intentHint: "analyze" },
        { text: "Compare the top 3 repositories", intentHint: "compare" },
      ];

      if (data.items.length > 5) {
        suggestions.push({ text: "Show more results", intentHint: "search" });
      }

      return suggestions;
    }

    case "repo_detail":
      return [
        { text: "Compare with similar repositories", intentHint: "compare" },
        { text: "Find alternatives", intentHint: "search" },
        { text: "Show recent issues", intentHint: "analyze" },
      ];

    case "comparison":
      return [
        { text: "Analyze the winner in detail", intentHint: "analyze" },
        { text: "Find similar repositories", intentHint: "search" },
      ];

    case "clarification":
      return data.options.map(opt => ({ text: opt }));

    default:
      return [];
  }
}
