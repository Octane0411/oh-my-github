# acs-integration Specification

## Purpose
TBD - created by archiving change implement-skill-discovery. Update Purpose after archive.
## Requirements
### Requirement: ACS Evaluation Prompt
The system SHALL use a structured LLM prompt to evaluate repositories across 4 ACS dimensions.

#### Scenario: Evaluation prompt structure
- **WHEN** Screener invokes ACS evaluation
- **THEN** send LLM prompt:
```markdown
You are the "Agent Compatibility Auditor". Evaluate this GitHub repository for AI Agent Skill suitability.

