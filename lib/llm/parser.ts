/**
 * Structured analysis result from LLM
 */
export interface AnalysisResult {
  summary: string;
  activityAnalysis: {
    interpretation: string;
    confidence: "high" | "medium" | "low";
  };
  contributionOpportunities: {
    assessment: string;
    suitableIssues: string[];
    confidence: "high" | "medium" | "low";
  };
  onboardingAssessment: {
    evaluation: string;
    strengths: string[];
    concerns: string[];
    confidence: "high" | "medium" | "low";
  };
  recommendations: string[];
}

/**
 * Partial analysis result when parsing fails
 */
export interface PartialAnalysisResult {
  isPartial: true;
  availableSections: string[];
  summary?: string;
  activityAnalysis?: {
    interpretation: string;
    confidence: "high" | "medium" | "low";
  };
  contributionOpportunities?: {
    assessment: string;
    suitableIssues: string[];
    confidence: "high" | "medium" | "low";
  };
  onboardingAssessment?: {
    evaluation: string;
    strengths: string[];
    concerns: string[];
    confidence: "high" | "medium" | "low";
  };
  recommendations?: string[];
  error: string;
}

/**
 * Parse error details
 */
export interface ParseError {
  message: string;
  rawContent: string;
  stage: "json-parse" | "validation" | "unknown";
}

/**
 * Parses LLM response into structured analysis result
 * @param content - Raw LLM response content
 * @returns Parsed analysis result or partial result with error details
 */
export function parseAnalysisResponse(
  content: string
): AnalysisResult | PartialAnalysisResult {
  try {
    // Attempt to parse JSON
    const parsed = JSON.parse(content);

    // Validate structure
    const validation = validateAnalysisStructure(parsed);
    if (!validation.isValid) {
      return createPartialResult(
        parsed,
        validation.errors,
        content,
        "validation"
      );
    }

    // Return complete result
    return parsed as AnalysisResult;
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        isPartial: true,
        availableSections: [],
        error: `Failed to parse JSON response: ${error.message}`,
      };
    }

    return {
      isPartial: true,
      availableSections: [],
      error: `Unknown parsing error: ${String(error)}`,
    };
  }
}

/**
 * Validates the structure of parsed analysis result
 * @param data - Parsed data object
 * @returns Validation result with any errors
 */
function validateAnalysisStructure(data: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null) {
    errors.push("Response is not an object");
    return { isValid: false, errors };
  }

  const obj = data as Record<string, unknown>;

  // Validate summary
  if (typeof obj.summary !== "string") {
    errors.push("Missing or invalid 'summary' field");
  }

  // Validate activityAnalysis
  if (
    typeof obj.activityAnalysis !== "object" ||
    obj.activityAnalysis === null
  ) {
    errors.push("Missing or invalid 'activityAnalysis' object");
  } else {
    const activity = obj.activityAnalysis as Record<string, unknown>;
    if (typeof activity.interpretation !== "string") {
      errors.push("Missing or invalid 'activityAnalysis.interpretation' field");
    }
    if (
      typeof activity.confidence !== "string" ||
      !["high", "medium", "low"].includes(activity.confidence as string)
    ) {
      errors.push("Missing or invalid 'activityAnalysis.confidence' field");
    }
  }

  // Validate contributionOpportunities
  if (
    typeof obj.contributionOpportunities !== "object" ||
    obj.contributionOpportunities === null
  ) {
    errors.push("Missing or invalid 'contributionOpportunities' object");
  } else {
    const contrib = obj.contributionOpportunities as Record<string, unknown>;
    if (typeof contrib.assessment !== "string") {
      errors.push(
        "Missing or invalid 'contributionOpportunities.assessment' field"
      );
    }
    if (!Array.isArray(contrib.suitableIssues)) {
      errors.push(
        "Missing or invalid 'contributionOpportunities.suitableIssues' array"
      );
    }
    if (
      typeof contrib.confidence !== "string" ||
      !["high", "medium", "low"].includes(contrib.confidence as string)
    ) {
      errors.push(
        "Missing or invalid 'contributionOpportunities.confidence' field"
      );
    }
  }

  // Validate onboardingAssessment
  if (
    typeof obj.onboardingAssessment !== "object" ||
    obj.onboardingAssessment === null
  ) {
    errors.push("Missing or invalid 'onboardingAssessment' object");
  } else {
    const onboarding = obj.onboardingAssessment as Record<string, unknown>;
    if (typeof onboarding.evaluation !== "string") {
      errors.push(
        "Missing or invalid 'onboardingAssessment.evaluation' field"
      );
    }
    if (!Array.isArray(onboarding.strengths)) {
      errors.push(
        "Missing or invalid 'onboardingAssessment.strengths' array"
      );
    }
    if (!Array.isArray(onboarding.concerns)) {
      errors.push("Missing or invalid 'onboardingAssessment.concerns' array");
    }
    if (
      typeof onboarding.confidence !== "string" ||
      !["high", "medium", "low"].includes(onboarding.confidence as string)
    ) {
      errors.push(
        "Missing or invalid 'onboardingAssessment.confidence' field"
      );
    }
  }

  // Validate recommendations
  if (!Array.isArray(obj.recommendations)) {
    errors.push("Missing or invalid 'recommendations' array");
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Creates a partial result from incomplete or malformed data
 * @param parsed - Partially parsed data
 * @param errors - Validation errors
 * @param rawContent - Original raw content
 * @param stage - Stage where parsing failed
 * @returns Partial analysis result
 */
function createPartialResult(
  parsed: Record<string, unknown>,
  errors: string[],
  rawContent: string,
  stage: "validation" | "json-parse"
): PartialAnalysisResult {
  const availableSections: string[] = [];
  const result: PartialAnalysisResult = {
    isPartial: true,
    availableSections,
    error: `Validation errors: ${errors.join("; ")}`,
  };

  // Try to extract any valid sections
  if (typeof parsed.summary === "string") {
    result.summary = parsed.summary;
    availableSections.push("summary");
  }

  if (
    typeof parsed.activityAnalysis === "object" &&
    parsed.activityAnalysis !== null
  ) {
    const activity = parsed.activityAnalysis as Record<string, unknown>;
    if (
      typeof activity.interpretation === "string" &&
      typeof activity.confidence === "string"
    ) {
      result.activityAnalysis = activity as AnalysisResult["activityAnalysis"];
      availableSections.push("activityAnalysis");
    }
  }

  if (
    typeof parsed.contributionOpportunities === "object" &&
    parsed.contributionOpportunities !== null
  ) {
    const contrib = parsed.contributionOpportunities as Record<string, unknown>;
    if (
      typeof contrib.assessment === "string" &&
      Array.isArray(contrib.suitableIssues) &&
      typeof contrib.confidence === "string"
    ) {
      result.contributionOpportunities =
        contrib as AnalysisResult["contributionOpportunities"];
      availableSections.push("contributionOpportunities");
    }
  }

  if (
    typeof parsed.onboardingAssessment === "object" &&
    parsed.onboardingAssessment !== null
  ) {
    const onboarding = parsed.onboardingAssessment as Record<string, unknown>;
    if (
      typeof onboarding.evaluation === "string" &&
      Array.isArray(onboarding.strengths) &&
      Array.isArray(onboarding.concerns) &&
      typeof onboarding.confidence === "string"
    ) {
      result.onboardingAssessment =
        onboarding as AnalysisResult["onboardingAssessment"];
      availableSections.push("onboardingAssessment");
    }
  }

  if (Array.isArray(parsed.recommendations)) {
    result.recommendations = parsed.recommendations.filter(
      (r): r is string => typeof r === "string"
    );
    if (result.recommendations.length > 0) {
      availableSections.push("recommendations");
    }
  }

  return result;
}

/**
 * Extracts confidence indicators from analysis result
 * @param result - Analysis result (complete or partial)
 * @returns Array of confidence assessments
 */
export function extractConfidenceIndicators(
  result: AnalysisResult | PartialAnalysisResult
): Array<{ section: string; confidence: string }> {
  const indicators: Array<{ section: string; confidence: string }> = [];

  if ("activityAnalysis" in result && result.activityAnalysis) {
    indicators.push({
      section: "Activity Analysis",
      confidence: result.activityAnalysis.confidence,
    });
  }

  if ("contributionOpportunities" in result && result.contributionOpportunities) {
    indicators.push({
      section: "Contribution Opportunities",
      confidence: result.contributionOpportunities.confidence,
    });
  }

  if ("onboardingAssessment" in result && result.onboardingAssessment) {
    indicators.push({
      section: "Onboarding Assessment",
      confidence: result.onboardingAssessment.confidence,
    });
  }

  return indicators;
}

/**
 * Checks if analysis result is complete
 * @param result - Analysis result to check
 * @returns true if result is complete, false if partial
 */
export function isCompleteResult(
  result: AnalysisResult | PartialAnalysisResult
): result is AnalysisResult {
  return !("isPartial" in result);
}
