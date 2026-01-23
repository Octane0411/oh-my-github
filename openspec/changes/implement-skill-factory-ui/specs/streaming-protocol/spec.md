## ADDED Requirements

### Requirement: Tool Call Events
The system SHALL emit tool call events during streaming to notify frontend of tool invocations and results.

#### Scenario: Tool call start event
- **WHEN** LLM invokes a tool (e.g., `findRepository`, `generateSkill`)
- **THEN** send tool-call event before tool execution:
```json
data: {"type":"tool-call","name":"findRepository","args":{"query":"PDF table extraction","language":"Python"}}

```
- **PURPOSE**: Frontend uses this to transition UI phase

#### Scenario: Tool call progress events
- **WHEN** tool execution is in progress (e.g., discovery pipeline stages)
- **THEN** send progress events:
```json
data: {"type":"tool-progress","tool":"findRepository","stage":"translating","message":"Analyzing query intent..."}
data: {"type":"tool-progress","tool":"findRepository","stage":"scouting","message":"Searching repositories..."}
data: {"type":"tool-progress","tool":"findRepository","stage":"screening","message":"Filtering by ACS scores..."}

```
- **PURPOSE**: Frontend displays live logs in ScoutBlock/FabricatorBlock

#### Scenario: Tool call result event
- **WHEN** tool execution completes successfully
- **THEN** send tool-result event:
```json
data: {"type":"tool-result","tool":"findRepository","result":{"repositories":[...],"summary":"..."}}

```
- **PURPOSE**: Frontend renders ACSScoreCard or SkillDeliveryCard

#### Scenario: Tool call error event
- **WHEN** tool execution fails
- **THEN** send tool-error event:
```json
data: {"type":"tool-error","tool":"findRepository","error":"GitHub API rate limit exceeded"}

```
- **AND** LLM continues conversation with error acknowledgment
- **PURPOSE**: Frontend displays error message and allows retry

## MODIFIED Requirements

None - existing streaming protocol events remain unchanged. Tool call events are additive.

## REMOVED Requirements

None - this change is purely additive.
