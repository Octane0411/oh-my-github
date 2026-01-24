# consultant-agent Specification

## Purpose
TBD - created by archiving change implement-skill-discovery. Update Purpose after archive.
## Requirements
### Requirement: Conversational Intent Recognition
The system SHALL use LLM reasoning to implicitly determine user intent and decide whether to invoke tools or continue conversation.

#### Scenario: Clear search intent triggers tool call
- **WHEN** user message contains specific technology and use case
- **EXAMPLES**: "Find Python libraries for PDF table extraction", "Show me Rust CLI tools for formatting"
- **THEN** LLM calls `findRepository` tool with extracted parameters
- **AND** no additional clarification is requested

#### Scenario: Ambiguous intent triggers clarification
- **WHEN** user message lacks specificity
- **EXAMPLES**: "I need something for PDFs", "Help me with animations"
- **THEN** LLM responds with clarifying questions (without tool call)
- **AND** conversation continues until intent is clear

#### Scenario: Direct URL triggers fabrication
- **WHEN** user message contains GitHub repository URL
- **EXAMPLES**: "Convert https://github.com/owner/repo to a skill", "Make a skill from pdfplumber"
- **THEN** LLM calls `generateSkill` tool with repository URL
- **AND** skips discovery pipeline

#### Scenario: Conversational messages receive acknowledgment
- **WHEN** user sends non-actionable messages
- **EXAMPLES**: "thanks", "that's helpful", "got it"
- **THEN** LLM responds conversationally (without tool call)
- **AND** maintains conversation context

### Requirement: Tool-Based Pipeline Orchestration
The system SHALL expose Discovery and Fabrication pipelines as tool functions invokable by the LLM.

#### Scenario: findRepository tool definition
- **WHEN** Consultant Agent initializes
- **THEN** register `findRepository` tool with schema:
```typescript
{
  name: "findRepository",
  description: "Search GitHub for tools/libraries suitable for Agent Skills",
  parameters: {
    query: string,          // Required: specific search description
    language?: string,      // Optional: programming language filter
    toolType?: "cli" | "library" | "api-wrapper" | "any"
  }
}
```

#### Scenario: findRepository tool execution
- **WHEN** LLM calls `findRepository` tool
- **THEN** invoke h2-skill-discovery LangGraph pipeline
- **AND** pass tool parameters as pipeline input
- **AND** await pipeline completion (up to 6 seconds)
- **AND** return structured result:
```typescript
{
  repositories: ScoredRepository[],  // Top 5 with ACS scores
  summary: string                    // Natural language summary
}
```

#### Scenario: generateSkill tool definition
- **WHEN** Consultant Agent initializes
- **THEN** register `generateSkill` tool with schema:
```typescript
{
  name: "generateSkill",
  description: "Convert a GitHub repository into an Agent Skill (Phase 7)",
  parameters: {
    repoUrl: string  // Required: GitHub repository URL
  }
}
```

#### Scenario: generateSkill tool execution (Phase 7 stub)
- **WHEN** LLM calls `generateSkill` tool
- **THEN** return stub response:
```typescript
{
  status: "pending",
  message: "Fabrication pipeline not yet implemented (Phase 7)"
}
```
- **NOTE**: Full implementation deferred to Phase 7

### Requirement: Multi-Turn Conversation Management
The system SHALL maintain conversation context across multiple turns to resolve ambiguity.

#### Scenario: Context preservation across turns
- **WHEN** user sends follow-up message
- **EXAMPLES**: "What about Python?", "Show me the second one", "Can you convert it?"
- **THEN** include all previous messages in LLM context
- **AND** resolve references using conversation history
- **AND** maintain user preferences (language, tool type) across turns

#### Scenario: Reference resolution from previous results
- **WHEN** user references previous search results
- **EXAMPLES**: "analyze the first one", "convert pdfplumber to a skill"
- **AND** previous response contains `repositories` array
- **THEN** resolve reference to specific repository
- **AND** invoke appropriate tool with resolved reference

#### Scenario: Multi-turn clarification flow
- **WHEN** intent remains unclear after 1 turn
- **THEN** continue clarification for up to 3 turns
- **AND** suggest examples to guide user
- **IF** still unclear after 3 turns, return general recommendations

#### Scenario: Context window management
- **WHEN** conversation exceeds 10 messages
- **THEN** include only last 10 messages in LLM context
- **AND** optionally compress older context into summary
- **AND** preserve critical information (user preferences, last results)

### Requirement: Streaming Response Delivery
The system SHALL stream both conversational responses and tool execution progress to the frontend.

#### Scenario: Text streaming during conversation
- **WHEN** LLM generates conversational response (no tool call)
- **THEN** stream response tokens as Server-Sent Events (SSE)
- **AND** send `data: { type: "text", content: "token" }` chunks
- **AND** complete stream with `data: [DONE]`

#### Scenario: Tool execution progress streaming
- **WHEN** LLM calls a tool (e.g., `findRepository`)
- **THEN** emit tool start event:
```typescript
{ type: "tool-call", tool: "findRepository", args: {...} }
```
- **AND** stream pipeline progress events:
```typescript
{ type: "progress", stage: "translating" | "scouting" | "screening" }
```
- **AND** emit tool completion event:
```typescript
{ type: "tool-result", tool: "findRepository", result: {...} }
```
- **AND** resume text streaming with LLM's interpretation of results

#### Scenario: Error handling during streaming
- **WHEN** tool execution fails
- **THEN** emit error event:
```typescript
{ type: "error", message: "Tool execution failed: {reason}" }
```
- **AND** LLM generates apologetic response with retry suggestion
- **AND** conversation continues (non-fatal)

### Requirement: LLM Model Selection
The system SHALL use GPT-4o-mini for cost-effective conversational intelligence.

#### Scenario: Model configuration
- **WHEN** Consultant Agent initializes
- **THEN** use model: `gpt-4o-mini`
- **AND** configure temperature: `0.7` (balanced creativity/consistency)
- **AND** configure max tokens: `1000` (sufficient for conversational responses)

#### Scenario: Tool calling capability
- **WHEN** sending requests to LLM
- **THEN** enable `tool_choice: "auto"` (LLM decides when to call tools)
- **AND** support parallel tool calls (if LLM calls multiple tools simultaneously)

#### Scenario: Cost tracking
- **WHEN** LLM request completes
- **THEN** log token usage:
```typescript
{
  input_tokens: number,
  output_tokens: number,
  cost: number  // Calculated from pricing
}
```
- **AND** accumulate conversation-level cost

### Requirement: System Prompt and Persona
The system SHALL use a well-defined system prompt to establish consultant behavior.

#### Scenario: System prompt content
- **WHEN** Consultant Agent initializes
- **THEN** set system prompt:
```markdown
You are the "Skill Discovery Consultant" for Oh-My-GitHub, an AI assistant that helps users find GitHub repositories and convert them into Agent Skills for Claude.

Your responsibilities:
1. **Clarify Intent**: If the user's request is vague, ask targeted questions to understand:
   - What task do they want to automate?
   - What programming language/ecosystem do they prefer?
   - Do they need a CLI tool, a library, or an API wrapper?

2. **Search for Tools**: Once intent is clear, use the `findRepository` tool to search GitHub for suitable repositories. Present results with ACS (Agent Compatibility Score) explanations.

3. **Direct Fabrication**: If the user provides a GitHub URL or specific tool name, use the `generateSkill` tool to convert it directly.

4. **Comparative Analysis**: Do not just list results. Recommend the best match, but offer alternatives based on trade-offs (e.g., "Repo A is more powerful, but Repo B is lighter").

5. **Be Concise**: Avoid lengthy explanations. Use bullet points for results.

Guidelines:
- Always explain ACS scores (why a repo is recommended)
- If search returns no good matches, suggest query refinement
- Maintain conversation context (remember user preferences)
```

#### Scenario: Persona consistency
- **WHEN** generating responses
- **THEN** maintain professional, helpful tone
- **AND** avoid over-explaining (keep responses concise)
- **AND** use technical terminology appropriately (user is a developer)

### Requirement: ACS-Based Recommendation Reasoning
The system SHALL analyze ACS dimensions to provide personalized recommendations that reduce decision paralysis.

#### Scenario: ACS dimension understanding
- **WHEN** presenting repository results
- **THEN** analyze the 4 ACS dimensions:
  - **Interface Clarity** (0-100): How easy is it to use? Clear API, simple setup, good examples
  - **Documentation** (0-100): Quality and completeness of docs, guides, examples
  - **Environment** (0-100): Cross-platform support, dependencies, compatibility
  - **Token Economy** (0-100): Code size, efficiency, token cost for AI processing
- **AND** identify which dimension(s) make each repository suitable for different use cases

#### Scenario: Top recommendation presentation
- **WHEN** findRepository tool returns results
- **THEN** analyze which ACS dimension(s) make the top choice ideal for the user's specific query
- **AND** present top recommendation with 2-3 sentences explaining why it's best
- **AND** reference the key ACS dimension that makes it ideal
- **EXAMPLE**: "This repo has exceptional Interface Clarity with an intuitive API, perfect for your quick integration needs"

#### Scenario: Alternative differentiation
- **WHEN** presenting alternatives to the top choice
- **THEN** explain which ACS dimension each alternative excels at (different trade-offs)
- **AND** phrase as "Choose this if you need [specific dimension benefit]"
- **EXAMPLES**:
  - "Choose this if you need better Documentation but don't mind more complex setup"
  - "Choose this if Token Economy is your priority for cost-sensitive use cases"
  - "Choose this if you prefer CLI tools with superior Interface Clarity"
- **AVOID** generic phrases like "also a good choice" or "another viable option"

#### Scenario: Progressive disclosure of alternatives
- **WHEN** presenting results
- **THEN** lead with ONE clear recommendation
- **AND** calculate score gap between top choice and first alternative
- **IF** score gap > 15 points (clear winner)
  - **THEN** focus presentation on top choice only
  - **AND** mention "This is a clear winner" to build confidence
  - **AND** don't present alternatives unless user specifically asks
- **IF** score gap < 15 points (close competition)
  - **THEN** present top choice prominently
  - **AND** show alternatives with clear differentiators based on ACS dimensions
  - **AND** help user choose based on their specific priority

#### Scenario: Reasoning quality validation
- **WHEN** generating recommendation reasoning
- **THEN** reasoning MUST reference specific ACS dimension(s)
- **AND** reasoning MUST connect to user's stated query/need
- **AND** reasoning MUST be specific (not generic like "good library")
- **EXAMPLE GOOD**: "Excels in Token Economy with compact code perfect for cost-sensitive AI workflows"
- **EXAMPLE BAD**: "This is a great library that works well"

#### Example: Before vs After ACS-Based Reasoning

**User Query**: "I want to extract text from PDF files for AI processing"

**BEFORE (Generic List)**:
```
Found 5 repositories:

1. PyMuPDF (⭐ 8,900, ACS: 87/100)
   Fast PDF library for Python

2. pdfplumber (⭐ 6,200, ACS: 82/100)
   Extract text and tables from PDFs

3. pdfminer.six (⭐ 5,400, ACS: 78/100)
   Python library for extracting information from PDFs

4. PyPDF2 (⭐ 7,800, ACS: 74/100)
   Pure Python PDF library

5. camelot (⭐ 4,300, ACS: 71/100)
   PDF table extraction for Python
```
❌ **Problem**: User faces decision paralysis - which one should they choose? They all sound good.

**AFTER (ACS-Based Reasoning)**:
```
I found the perfect tool for extracting text from PDFs! 🎯

**Best Choice: PyMuPDF**

This is your best bet because it excels in **Interface Clarity** with an intuitive API and **Token Economy** with efficient code that's perfect for AI processing. It's the fastest Python library for PDF text extraction, with excellent support for complex PDFs including scanned documents. With 8,900+ stars, it's battle-tested and actively maintained.

Key strengths:
- Lightning-fast performance (written in C)
- Handles both text and OCR
- Excellent documentation with tons of examples (high Documentation score)
- Works great for Agent Skills - simple API (superior Interface Clarity)

Perfect for: Your use case of extracting text from PDFs for AI processing.

---

📋 **If you need something different:**

**pdfplumber** - Choose this if you need to extract tables with precise formatting
- Stronger at preserving table structure
- Better **Documentation** for beginners (but lower Token Economy - slower)

**pdfminer.six** - Choose this if you need low-level control over PDF parsing
- Most customizable for complex parsing needs
- Lower **Interface Clarity** but maximum flexibility

Would you like me to generate a skill from PyMuPDF?
```
✅ **Improvement**: User immediately knows PyMuPDF is best for their needs (AI processing = need speed + simplicity). Alternatives are shown only if they have different priorities (better docs, more control).

### Requirement: Input Validation and Safety
The system SHALL validate user input and handle malicious inputs gracefully.

#### Scenario: Query length validation
- **WHEN** user sends message
- **THEN** limit message length to 1000 characters
- **IF** exceeds limit, return error: "Message too long. Please be more concise."

#### Scenario: URL validation for generateSkill
- **WHEN** `generateSkill` tool is called with `repoUrl`
- **THEN** validate URL format matches: `https://github.com/{owner}/{repo}`
- **IF** invalid, return error: "Invalid GitHub URL. Must be https://github.com/owner/repo"

#### Scenario: Rate limiting (future)
- **WHEN** user sends excessive requests
- **THEN** track requests per conversation
- **AND** limit to 20 tool calls per conversation
- **IF** exceeded, return error: "Rate limit exceeded. Please start a new conversation."

### Requirement: Error Handling and Fallbacks
The system SHALL handle tool failures gracefully without breaking conversation flow.

#### Scenario: Tool execution timeout
- **WHEN** tool execution exceeds 10 seconds
- **THEN** cancel tool execution
- **AND** LLM responds: "Search is taking longer than expected. Please try again with a more specific query."
- **AND** conversation continues (user can retry)

#### Scenario: Tool execution error
- **WHEN** tool returns error (e.g., GitHub API rate limit)
- **THEN** pass error message to LLM
- **AND** LLM generates user-friendly explanation
- **AND** suggests alternative action (e.g., "Try again in a few minutes")

#### Scenario: LLM API failure
- **WHEN** LLM API is unavailable
- **THEN** return fallback response: "I'm temporarily unavailable. Please try again in a moment."
- **AND** log error for monitoring

### Requirement: Observability and Logging
The system SHALL log all conversations, tool calls, and decisions for debugging and improvement.

#### Scenario: Conversation logging
- **WHEN** conversation starts
- **THEN** assign unique `conversationId`
- **AND** log every message with:
```typescript
{
  conversationId: string,
  timestamp: string,
  role: "user" | "assistant" | "tool",
  content: string,
  toolCall?: { tool: string, args: any }
}
```

#### Scenario: Tool call logging
- **WHEN** tool is invoked
- **THEN** log:
```typescript
{
  conversationId: string,
  tool: string,
  args: any,
  startTime: string,
  endTime: string,
  duration: number,
  result: any,
  success: boolean
}
```

#### Scenario: Cost tracking per conversation
- **WHEN** conversation completes
- **THEN** calculate total cost:
```typescript
{
  conversationId: string,
  llm_calls: number,
  total_tokens: number,
  total_cost: number,
  tool_calls: { findRepository: number, generateSkill: number }
}
```

### Requirement: Performance Targets
The system SHALL respond quickly for conversational turns while allowing time for tool execution.

#### Scenario: Conversational response latency
- **WHEN** LLM responds without tool call
- **THEN** first token arrives within 500ms
- **AND** full response completes within 2 seconds

#### Scenario: Tool call latency
- **WHEN** LLM calls `findRepository` tool
- **THEN** complete within 8 seconds (6s pipeline + 2s overhead)
- **AND** stream progress events every 1 second

#### Scenario: Total conversation latency
- **WHEN** user sends message and receives final response
- **THEN** complete within 10 seconds (worst case with tool call)

