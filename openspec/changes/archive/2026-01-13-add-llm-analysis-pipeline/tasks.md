## 1. Environment Setup
- [x] 1.1 Verify DeepSeek V3 API key in `.env` (DEEPSEEK_V3_API_KEY)
- [x] 1.2 Install required packages: `openai` SDK (compatible with OpenRouter/DeepSeek)

## 2. LLM Integration Implementation
- [x] 2.1 Create `lib/llm/client.ts` with LLM provider abstraction
  - [x] 2.1.1 Implement DeepSeek V3 client using OpenAI SDK compatibility
  - [x] 2.1.2 Implement token usage tracking for all requests
  - [x] 2.1.3 Add configuration for timeout (default 60s) and pricing rates
- [x] 2.2 Create `lib/llm/prompts.ts` with prompt templates
  - [x] 2.2.1 Define analysis prompt templates for specific report sections (not full report)
  - [x] 2.2.2 Add template variable interpolation function
  - [x] 2.2.3 Include system prompts for consistent JSON output format
- [x] 2.3 Implement response parsing in `lib/llm/parser.ts`
  - [x] 2.3.1 Parse structured JSON sections from LLM output
  - [x] 2.3.2 Handle malformed responses (invalid JSON) gracefully
  - [x] 2.3.3 Extract confidence indicators and caveats

## 3. Report Generation Implementation
- [x] 3.1 Create `lib/reports/generator.ts` with report generation logic
  - [x] 3.1.1 Implement Markdown report generation using hybrid approach
  - [x] 3.1.2 Implement metrics pre-calculation logic (merge rates, response times)
  - [x] 3.1.3 Implement intelligent issue pre-filtering logic (beyond labels)
  - [x] 3.1.4 Format metrics tables (Markdown only)
- [x] 3.2 Create `lib/reports/templates.ts` with report templates
  - [x] 3.2.1 Define default contribution analysis template structure
  - [x] 3.2.2 Implement hybrid rendering: inject metrics + LLM analysis blocks
  - [x] 3.2.3 Support brief vs detailed report formats
- [x] 3.3 Implement report validation in `lib/reports/validator.ts`
  - [x] 3.3.1 Check section completeness
  - [x] 3.3.2 Validate Markdown syntax


## 4. Error Handling and Resilience
- [x] 4.1 Add retry logic with exponential backoff in `lib/llm/client.ts`
- [x] 4.2 Implement rate limit handling with retry-after support
- [x] 4.3 Add timeout handling (30s default) with graceful degradation
- [x] 4.4 Log errors and token usage for debugging

## 5. Testing and Validation
- [x] 5.1 Create `scripts/test-llm.ts` test script
  - [x] 5.1.1 Test LLM integration with sample repository metadata
  - [x] 5.1.2 Test report generation with 2-3 different repositories
  - [x] 5.1.3 Verify token usage tracking accuracy
  - [x] 5.1.4 Validate report structure and completeness
- [ ] 5.2 Perform prompt optimization
  - [ ] 5.2.1 Test with repositories of varying quality (high/medium/low)
  - [ ] 5.2.2 Refine prompts based on output quality
  - [ ] 5.2.3 Document optimal prompt parameters
- [ ] 5.3 Estimate costs
  - [ ] 5.3.1 Calculate average token usage per analysis
  - [ ] 5.3.2 Estimate cost per repository analysis
  - [ ] 5.3.3 Document findings in proposal

## 6. Integration with GitHub Data Layer
- [x] 6.1 Create integration function in `lib/analysis.ts`
  - [x] 6.1.1 Combine metadata extraction with LLM analysis
  - [x] 6.1.2 Pass repository metadata to LLM client
  - [x] 6.1.3 Generate final report from combined data
- [ ] 6.2 Test end-to-end workflow: search → metadata → analysis → report

## 7. Documentation
- [x] 7.1 Add JSDoc comments to all exported functions
- [x] 7.2 Create `lib/llm/README.md` with usage examples and provider configuration
- [x] 7.3 Create `lib/reports/README.md` with report format documentation
- [x] 7.4 Document token costs and optimization strategies
- [ ] 7.5 Add example reports to documentation