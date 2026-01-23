## ADDED Requirements

### Requirement: UI-Friendly Tool Result Formatting
The system SHALL format tool results to be directly consumable by frontend UI components without additional transformation.

#### Scenario: findRepository result structure
- **WHEN** `findRepository` tool completes
- **THEN** return structured result matching ACSScoreCard component props:
```typescript
{
  repositories: Array<{
    owner: string,
    name: string,
    description: string,
    url: string,
    stars: number,
    language: string,
    license: string,
    acsScore: {
      total: number,        // 0-100
      interface: "Excellent" | "Good" | "Fair",
      documentation: "High Quality" | "Adequate" | "Basic"
    }
  }>,
  summary: string  // Natural language summary for LLM to incorporate
}
```

#### Scenario: generateSkill result structure (Phase 7 stub)
- **WHEN** `generateSkill` tool completes (currently stub)
- **THEN** return structured result matching SkillDeliveryCard component props:
```typescript
{
  status: "success" | "pending" | "error",
  skillName: string,
  repositoryUrl: string,
  downloadUrl?: string,       // ZIP file URL (Phase 7)
  instructionsPreview: string, // First 200 chars of SKILL.md
  message: string              // User-facing status message
}
```

#### Scenario: Tool result validation
- **WHEN** tool returns result
- **THEN** validate result structure matches expected schema
- **IF** validation fails, log error and return fallback result
- **AND** LLM receives error message to explain to user

### Requirement: Progress Event Emission During Tool Execution
The system SHALL emit progress events to streaming protocol during tool execution for live UI feedback.

#### Scenario: Discovery pipeline progress events
- **WHEN** `findRepository` tool executes
- **THEN** emit progress events at each pipeline stage:
  1. `stage: "translating"`, `message: "Analyzing query intent..."`
  2. `stage: "scouting"`, `message: "Searching GitHub repositories..."`
  3. `stage: "screening"`, `message: "Filtering by ACS scores..."`
- **AND** each event SHALL include timestamp
- **AND** events SHALL be sent via SSE stream

#### Scenario: Fabrication pipeline progress events (Phase 7)
- **WHEN** `generateSkill` tool executes
- **THEN** emit progress events at each step:
  1. `stage: "initializing"`, `message: "Initializing Meta-Skill Engine..."`
  2. `stage: "analyzing"`, `message: "Reading repository: {owner}/{repo}..."`
  3. `stage: "synthesizing"`, `message: "Synthesizing SKILL.md instructions..."`
  4. `stage: "packaging"`, `message: "Packaging artifact: {name}-skill.zip..."`
- **PURPOSE**: Frontend displays in FabricatorBlock terminal logs

#### Scenario: Progress event timing
- **WHEN** emitting progress events
- **THEN** send first event within 100ms of tool invocation
- **AND** send subsequent events as pipeline stages complete (not on fixed interval)
- **PURPOSE**: Keep UI responsive and informative

## MODIFIED Requirements

None - existing consultant agent requirements remain unchanged. UI-facing enhancements are additive.

## REMOVED Requirements

None - this change is purely additive.
