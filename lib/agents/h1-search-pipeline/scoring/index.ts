/**
 * Repository Quality Scoring System
 *
 * Exports all scoring functions:
 * - Metadata-based dimensions (Maturity, Activity, Community, Maintenance)
 * - LLM-based dimensions (Documentation, Ease of Use, Relevance)
 * - Overall score aggregation
 */

export {
  calculateMaturity,
  calculateActivity,
  calculateCommunity,
  calculateMaintenance,
  calculateMetadataScores,
  calculateOverallScore,
} from "./dimensions";

export { evaluateWithLLM, batchEvaluateWithLLM } from "./llm-evaluation";
export type { LLMEvaluationResult } from "./llm-evaluation";
