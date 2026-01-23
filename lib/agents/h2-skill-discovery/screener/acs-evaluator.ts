/**
 * ACS (Agent Compatibility Score) Evaluator
 *
 * Evaluates repositories for AI Agent Skill suitability
 */

import { Repository, ACSScore } from "../state";
import { createLLMClient, callLLMWithTimeout, getModelName } from "../llm-config";
import { RepositoryContext } from "./context-fetcher";

/**
 * Build ACS evaluation prompt
 */
function buildACSPrompt(repo: Repository, context: RepositoryContext): string {
  return `You are the "Agent Compatibility Auditor". Evaluate this GitHub repository for AI Agent Skill suitability.

## Repository Context
- **Name**: ${repo.full_name}
- **Language**: ${repo.language || "Unknown"}
- **Stars**: ${repo.stars}
- **Description**: ${repo.description || "No description"}

## README (First 3000 chars)
${context.readme || "README not found"}

## File Structure (Top 2 Levels)
${context.fileTree || "File tree not available"}

## Dependencies
${context.dependencyFile || "Not found"}

---

## Evaluation Criteria

Score this repository on 4 dimensions (total 100 points):

### 1. Interface Clarity (0-30 points)
How easy is it for an AI agent to invoke this tool?
- **CLI Support (0-15)**: Does it have a command-line interface? (\`argparse\`, \`click\`, \`fire\`, \`typer\`, \`bin/\` scripts)
- **Simple API (0-10)**: Does it provide simple function calls? (vs complex class hierarchies)
- **Clear Arguments (0-5)**: Are parameters well-documented and predictable?

### 2. Documentation Quality (0-30 points)
How easy is it for an AI agent to learn to use this tool?
- **Usage Section (0-15)**: Is there a clear "Usage" or "Quickstart" section?
- **Code Examples (0-10)**: Are there copy-pasteable examples?
- **Input/Output Specs (0-5)**: Are input formats and output formats clearly documented?

### 3. Environment Friendliness (0-20 points)
How easy is it for an AI agent to install and run this tool?
- **Standard Dependencies (0-10)**: Uses standard package management? (\`requirements.txt\`, \`package.json\`, \`Cargo.toml\`)
- **Pure Code (0-5)**: No complex system dependencies? (e.g., no \`ffmpeg\`, \`imagemagick\`)
- **Containerization (0-5)**: Provides \`Dockerfile\` or Docker support?

### 4. Token Economy (0-20 points)
How cost-effective is it to use this tool with LLMs?
- **Concise Output (0-10)**: Does it output clean JSON/text instead of verbose logs?
- **Moderate Size (0-10)**: Is the core codebase small enough to read in LLM context? (<5000 LOC)

---

## Output Format (JSON)
Respond ONLY with valid JSON (no markdown, no explanations):

{
  "interface_clarity": {
    "score": <number 0-30>,
    "reason": "<brief explanation, max 100 chars>",
    "has_cli": <boolean>
  },
  "documentation": {
    "score": <number 0-30>,
    "reason": "<brief explanation, max 100 chars>",
    "has_usage_examples": <boolean>
  },
  "environment": {
    "score": <number 0-20>,
    "reason": "<brief explanation, max 100 chars>",
    "complexity": "low" | "medium" | "high"
  },
  "token_economy": {
    "score": <number 0-20>,
    "reason": "<brief explanation, max 100 chars>"
  },
  "total_score": <number 0-100>,
  "recommendation": "HIGHLY_RECOMMENDED" | "POSSIBLE" | "NOT_RECOMMENDED",
  "skill_strategy": "CLI_WRAPPER" | "PYTHON_SCRIPT" | "API_CALL" | "MANUAL_REQUIRED"
}`;
}

/**
 * Default ACS score for evaluation failures
 */
function getDefaultACSScore(_reason: string): ACSScore {
  return {
    total: 50,
    breakdown: {
      interface_clarity: 15,
      documentation: 15,
      environment: 10,
      token_economy: 10,
    },
    recommendation: "POSSIBLE",
    skill_strategy: "MANUAL_REQUIRED",
  };
}

/**
 * Validate and normalize ACS score
 */
function validateACSScore(parsed: unknown): ACSScore {
  // Type guard for parsed object
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid ACS response structure');
  }

  const parsedObj = parsed as Record<string, unknown>;

  // Helper to safely extract score
  const getScore = (field: string, defaultValue: number) => {
    const obj = parsedObj[field] as { score?: number } | undefined;
    return obj?.score ?? defaultValue;
  };

  // Clamp scores to valid ranges
  const interface_clarity = Math.max(0, Math.min(30, getScore('interface_clarity', 15)));
  const documentation = Math.max(0, Math.min(30, getScore('documentation', 15)));
  const environment = Math.max(0, Math.min(20, getScore('environment', 10)));
  const token_economy = Math.max(0, Math.min(20, getScore('token_economy', 10)));

  const total = interface_clarity + documentation + environment + token_economy;

  // Derive recommendation from total score
  let recommendation: ACSScore["recommendation"];
  if (total >= 80) {
    recommendation = "HIGHLY_RECOMMENDED";
  } else if (total >= 60) {
    recommendation = "POSSIBLE";
  } else {
    recommendation = "NOT_RECOMMENDED";
  }

  // Extract skill_strategy safely
  const skill_strategy = parsedObj.skill_strategy as ACSScore['skill_strategy'] | undefined;

  return {
    total,
    breakdown: {
      interface_clarity,
      documentation,
      environment,
      token_economy,
    },
    recommendation,
    skill_strategy: skill_strategy || "MANUAL_REQUIRED",
  };
}

/**
 * Evaluate repository with ACS scoring
 */
export async function evaluateRepository(
  repo: Repository,
  context: RepositoryContext
): Promise<{ acsScore: ACSScore; reasoning: string }> {
  const client = createLLMClient();
  const model = getModelName("screener");

  try {
    const prompt = buildACSPrompt(repo, context);
    const messages = [{ role: "user" as const, content: prompt }];

    // Call LLM with 8-second timeout
    const response = await callLLMWithTimeout(client, messages, model, 8000);

    // Clean response: remove markdown code blocks if present
    let cleanedResponse = response.trim();

    // Remove ```json ... ``` or ``` ... ``` blocks
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*\n/, '') // Remove opening ```json or ```
        .replace(/\n```\s*$/, '');          // Remove closing ```
    }

    // Parse JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error(`Failed to parse ACS response for ${repo.full_name}:`, parseError);
      console.error(`Raw response:`, response.substring(0, 200));
      return {
        acsScore: getDefaultACSScore("JSON parse error"),
        reasoning: "Evaluation failed: invalid JSON response",
      };
    }

    // Validate and normalize scores
    const acsScore = validateACSScore(parsed);

    // Extract reasoning from parsed response
    const parsedObj = parsed as Record<string, unknown>;
    const getReason = (field: string) => {
      const obj = parsedObj[field] as { reason?: string } | undefined;
      return obj?.reason;
    };

    const reasoning = [
      getReason('interface_clarity'),
      getReason('documentation'),
      getReason('environment'),
      getReason('token_economy'),
    ]
      .filter(Boolean)
      .join("; ");

    return {
      acsScore,
      reasoning: reasoning || "No detailed reasoning provided",
    };
  } catch (error) {
    console.error(`ACS evaluation error for ${repo.full_name}:`, error);

    return {
      acsScore: getDefaultACSScore("Evaluation timeout or error"),
      reasoning: `Evaluation failed: ${(error as Error).message}`,
    };
  }
}
