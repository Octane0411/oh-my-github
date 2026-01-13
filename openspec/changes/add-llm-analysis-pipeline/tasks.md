## 1. Environment Setup
- [ ] 1.1 Verify DeepSeek V3 API key in `.env` (DEEPSEEK_V3_API_KEY)
- [ ] 1.2 Install required packages: `openai` SDK (compatible with OpenRouter/DeepSeek)

## 2. LLM Integration Implementation
- [ ] 2.1 Create `lib/llm/client.ts` with LLM provider abstraction
  - [ ] 2.1.1 Implement DeepSeek V3 client using OpenAI SDK compatibility
  - [ ] 2.1.2 Implement token usage tracking for all requests
  - [ ] 2.1.3 Add configuration for timeout (default 60s) and pricing rates
- [ ] 2.2 Create `lib/llm/prompts.ts` with prompt templates
  - [ ] 2.2.1 Define analysis prompt templates for specific report sections (not full report)
  - [ ] 2.2.2 Add template variable interpolation function
  - [ ] 2.2.3 Include system prompts for consistent JSON output format
- [ ] 2.3 Implement response parsing in `lib/llm/parser.ts`
  - [ ] 2.3.1 Parse structured JSON sections from LLM output
  - [ ] 2.3.2 Handle malformed responses (invalid JSON) gracefully
  - [ ] 2.3.3 Extract confidence indicators and caveats

## 3. Report Generation Implementation
- [ ] 3.1 Create `lib/reports/generator.ts` with report generation logic
  - [ ] 3.1.1 Implement Markdown report generation using hybrid approach
  - [ ] 3.1.2 Implement metrics pre-calculation logic (merge rates, response times)
  - [ ] 3.1.3 Implement intelligent issue pre-filtering logic (beyond labels)
  - [ ] 3.1.4 Format metrics tables (Markdown only)
- [ ] 3.2 Create `lib/reports/templates.ts` with report templates
  - [ ] 3.2.1 Define default contribution analysis template structure
  - [ ] 3.2.2 Implement hybrid rendering: inject metrics + LLM analysis blocks
  - [ ] 3.2.3 Support brief vs detailed report formats
- [ ] 3.3 Implement report validation in `lib/reports/validator.ts`
  - [ ] 3.3.1 Check section completeness
  - [ ] 3.3.2 Validate Markdown syntax


## 4. Error Handling and Resilience
- [ ] 4.1 Add retry logic with exponential backoff in `lib/llm/client.ts`
- [ ] 4.2 Implement rate limit handling with retry-after support
- [ ] 4.3 Add timeout handling (30s default) with graceful degradation
- [ ] 4.4 Log errors and token usage for debugging

## 5. Testing and Validation
- [ ] 5.1 Create `scripts/test-llm.ts` test script
  - [ ] 5.1.1 Test LLM integration with sample repository metadata
  - [ ] 5.1.2 Test report generation with 2-3 different repositories
  - [ ] 5.1.3 Verify token usage tracking accuracy
  - [ ] 5.1.4 Validate report structure and completeness
- [ ] 5.2 Perform prompt optimization
  - [ ] 5.2.1 Test with repositories of varying quality (high/medium/low)
  - [ ] 5.2.2 Refine prompts based on output quality
  - [ ] 5.2.3 Document optimal prompt parameters
- [ ] 5.3 Estimate costs
  - [ ] 5.3.1 Calculate average token usage per analysis
  - [ ] 5.3.2 Estimate cost per repository analysis
  - [ ] 5.3.3 Document findings in proposal

## 6. Integration with GitHub Data Layer
- [ ] 6.1 Create integration function in `lib/analysis.ts`
  - [ ] 6.1.1 Combine metadata extraction with LLM analysis
  - [ ] 6.1.2 Pass repository metadata to LLM client
  - [ ] 6.1.3 Generate final report from combined data
- [ ] 6.2 Test end-to-end workflow: search → metadata → analysis → report

## 7. Documentation
- [ ] 7.1 Add JSDoc comments to all exported functions
- [ ] 7.2 Create `lib/llm/README.md` with usage examples and provider configuration
- [ ] 7.3 Create `lib/reports/README.md` with report format documentation
- [ ] 7.4 Document token costs and optimization strategies
- [ ] 7.5 Add example reports to documentation