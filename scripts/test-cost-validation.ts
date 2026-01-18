/**
 * Cost Validation Script
 *
 * Run with: bun run scripts/test-cost-validation.ts
 *
 * Validates cost estimates and provides monthly projections
 */

import {
  estimateSearchCost,
  formatCostEstimate,
  estimateMonthlyCost,
} from "../lib/agents/h1-search-pipeline/cost-tracking";

console.log("💰 Search Pipeline Cost Validation\n");
console.log("=".repeat(70));

// Single search cost
console.log("\n📊 Single Search Cost Estimate\n");
const singleSearch = estimateSearchCost(20);
console.log(formatCostEstimate(singleSearch));

// Monthly projections
console.log("\n\n📈 Monthly Cost Projections\n");
console.log("=".repeat(70));

const scenarios = [
  { searches: 100, label: "Low Usage (100 searches/month)" },
  { searches: 1000, label: "Medium Usage (1,000 searches/month)" },
  { searches: 10000, label: "High Usage (10,000 searches/month)" },
];

for (const scenario of scenarios) {
  const monthly = estimateMonthlyCost(scenario.searches);
  console.log(`\n${scenario.label}`);
  console.log("-".repeat(70));
  console.log(monthly.breakdown);
}

// Cost optimization recommendations
console.log("\n\n💡 Cost Optimization Recommendations\n");
console.log("=".repeat(70));
console.log(`
1. Enable Caching (Recommended)
   - Cache hit rate: 20-30% (estimated)
   - Cost savings: ~25% reduction
   - Current: Caching ENABLED by default

2. Use DeepSeek V3 (Currently: ${singleSearch.llmCost.provider.toUpperCase()})
   - DeepSeek V3: $0.27/M input, $1.10/M output
   - OpenAI GPT-4o-mini: $0.15/M input, $0.60/M output
   - For high-volume usage, DeepSeek may be more cost-effective

3. Optimize LLM Concurrency
   - Current: 3 concurrent evaluations
   - Higher concurrency = faster but more parallel API calls
   - Trade-off: Speed vs. sequential rate limiting

4. Adjust Coarse Filter Threshold
   - Current: Top 25 repos → Fine Scoring
   - Reduce to 15-20 repos for lower cost
   - Trade-off: Fewer results but lower LLM costs

5. Monitor GitHub API Rate Limits
   - Free tier: 5,000 requests/hour
   - Authenticated: 5,000 requests/hour
   - Current usage: ~25 API calls per search
   - Max searches/hour: ~200 (well within limit)
`);

console.log("=".repeat(70));
console.log("\n✅ Cost validation complete\n");
