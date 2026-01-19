# context-compression Specification

## Purpose
Compresses large content (README files, issue lists, file trees) to fit within LLM context windows while preserving critical information. Balances detail preservation with token efficiency for multi-turn conversations.

## ADDED Requirements

### Requirement: README Compression
The system SHALL compress README content exceeding 2000 characters using LLM summarization.

#### Scenario: README under threshold
- **WHEN** README content <= 2000 characters
- **THEN** use original content unchanged
- **AND** store in `contextSummary` field

#### Scenario: README over threshold
- **WHEN** README content > 2000 characters
- **THEN** invoke DeepSeek V3 for summarization
- **AND** prompt: "Summarize this README, preserving key features, installation steps, and usage examples."
- **AND** limit input to 8000 characters (fits in prompt)
- **AND** store summary in `contextSummary` field

#### Scenario: README summarization timeout
- **WHEN** LLM takes > 5 seconds to summarize
- **THEN** cancel request
- **AND** fallback to simple truncation (first 2000 chars)
- **AND** log timeout event

#### Scenario: README summarization error
- **WHEN** LLM returns error or invalid response
- **THEN** fallback to simple truncation
- **AND** log error with README URL
- **AND** add ellipsis: "... (truncated)"

### Requirement: Issue List Compression
The system SHALL compress large issue lists to top relevant items.

#### Scenario: Issue list under limit
- **WHEN** issue list <= 20 items
- **THEN** use all issues unchanged
- **AND** store in `contextSummary` field

#### Scenario: Issue list over limit
- **WHEN** issue list > 20 items
- **THEN** extract top 5 most relevant issues
- **RELEVANCE CRITERIA**:
  - Recent activity (last 30 days)
  - High engagement (comments > 5)
  - Labels: "good first issue", "help wanted", "bug"
  - Priority labels (if available)
- **AND** store compressed list in `contextSummary`

#### Scenario: Issue context preservation
- **WHEN** compressing issue list
- **THEN** preserve for each issue:
  - Title
  - URL
  - Created date
  - Comment count
  - Labels (if any)
  - State (open/closed)

### Requirement: File Tree Compression
The system SHALL compress large file trees to top-level structure.

#### Scenario: File tree under limit
- **WHEN** file tree <= 100 files
- **THEN** use complete tree unchanged
- **AND** store in `contextSummary` field

#### Scenario: File tree over limit
- **WHEN** file tree > 100 files
- **THEN** show top-level directories only
- **AND** show file count per directory
- **EXAMPLE**:
```
src/
  ├── components/ (45 files)
  ├── hooks/ (12 files)
  └── utils/ (23 files)
tests/ (38 files)
docs/ (15 files)
```

#### Scenario: Key files inclusion
- **WHEN** compressing file tree
- **THEN** always include important files:
  - `README.md`
  - `CONTRIBUTING.md`
  - `LICENSE`
  - `package.json`
  - `tsconfig.json`
  - `.gitignore`
- **EVEN IF** they're in subdirectories

### Requirement: Code Snippet Compression
The system SHALL compress large code snippets to key functions.

#### Scenario: Code snippet under limit
- **WHEN** code snippet <= 500 lines
- **THEN** use complete snippet unchanged
- **AND** store in `contextSummary` field

#### Scenario: Code snippet over limit
- **WHEN** code snippet > 500 lines
- **THEN** extract key functions:
  - Main export functions
  - Public API methods
  - Event handlers
  - State management logic
- **AND** exclude:
  - Test files
  - Type definitions (can be inferred)
  - Comments (keep only docstrings)
- **AND** store compressed snippet in `contextSummary`

### Requirement: Compression Configuration
The system SHALL provide configurable compression thresholds.

#### Scenario: Default thresholds
- **WHEN** compressor is initialized
- **THEN** use default thresholds:
```typescript
{
  readmeMaxChars: 2000,
  issueMaxItems: 20,
  fileTreeMaxFiles: 100,
  codeSnippetMaxLines: 500,
  llmTimeout: 5000,
  enableLLMSummarization: true
}
```

#### Scenario: Environment override
- **WHEN** environment variables are set
- **THEN** override defaults:
```bash
COMPRESSION_README_MAX_CHARS=4000
COMPRESSION_ENABLE_LLM=false
```

#### Scenario: Runtime configuration
- **WHEN** compressor function is called
- **THEN** accept optional config parameter:
```typescript
await compressContent(content, {
  maxChars: 4000,
  useLLM: false
})
```

### Requirement: Fallback Strategy
The system SHALL provide robust fallbacks when compression fails.

#### Scenario: LLM API unavailable
- **WHEN** LLM API returns error (rate limit, timeout, etc.)
- **THEN** fallback to simple truncation
- **AND** log fallback event
- **AND** continue processing without interruption

#### Scenario: LLM response invalid
- **WHEN** LLM returns non-text or empty response
- **THEN** fallback to simple truncation
- **AND** log validation error
- **AND** include original content length in log

#### Scenario: LLM cost limit
- **WHEN** compression cost exceeds $0.01 per conversation
- **THEN** disable LLM summarization for remaining requests
- **AND** fallback to truncation
- **AND** log cost limit reached

### Requirement: Context Summary Storage
The system SHALL store compressed content in AgentState.

#### Scenario: Add contextSummary to state
- **WHEN** content is compressed
- **THEN** store in `AgentState.contextSummary`:
```typescript
{
  readme?: string,        // Compressed README
  issues?: string,        // Compressed issue list
  fileTree?: string,     // Compressed file tree
  codeSnippets?: string[] // Compressed code snippets
}
```

#### Scenario: Retrieve context for routing
- **WHEN** coordinator needs routing context
- **THEN** include `contextSummary` in prompt
- **AND** format as:
```
Previous context:
- README: {readme_summary}
- Key files: {file_tree}
- Recent issues: {issues_summary}
```

### Requirement: Performance Targets
The system SHALL meet compression performance requirements.

#### Scenario: Truncation performance
- **WHEN** using simple truncation (no LLM)
- **THEN** complete within 10ms (95th percentile)

#### Scenario: LLM summarization performance
- **WHEN** using LLM for summarization
- **THEN** complete within 5 seconds (95th percentile)
- **AND** cost < $0.0002 per README

#### Scenario: Memory efficiency
- **WHEN** compressing large documents
- **THEN** keep memory usage < 50MB per compression operation
- **AND** release memory immediately after compression

### Requirement: Cost Tracking
The system SHALL track compression costs for observability.

#### Scenario: Log LLM usage
- **WHEN** LLM summarization completes
- **THEN** log:
```typescript
{
  operation: 'readme_compression',
  inputLength: originalContent.length,
  outputLength: summary.length,
  compressionRatio: summary.length / originalContent.length,
  tokens: { input: 1234, output: 567 },
  cost: 0.0002,
  latency: 2345
}
```

#### Scenario: Aggregate cost per conversation
- **WHEN** conversation completes
- **THEN** calculate total compression cost
- **AND** include in conversation metadata
- **AND** log if cost > $0.01 (warning threshold)
