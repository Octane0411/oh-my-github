## MODIFIED Requirements

### Requirement: Repository Results Display
The system SHALL present discovered repositories in a way that reduces user decision time by highlighting the best-fit recommendation with clear differentiation from alternatives.

#### Scenario: Top recommendation prominence
- **WHEN** discovery results are displayed
- **THEN** present top-ranked repository with visual distinction:
  - Larger card or prominent positioning (primary focus)
  - Badge or indicator showing "🎯 Best Match" or similar
  - Recommendation reasoning (2-3 sentences explaining why it's best)
  - ACS score breakdown showing dominant dimension(s)

#### Scenario: Alternative options with conditional reasoning
- **WHEN** presenting alternative repositories (2-5 available)
- **THEN** display in secondary section titled "If you need different trade-offs:"
- **AND** each alternative includes:
  - Repository name, stars, and ACS score
  - **Condition for selection** (e.g., "Choose if you need better documentation" or "Choose if token economy is critical")
  - Key differentiator vs. top recommendation
- **AND** alternatives remain visually distinct from primary recommendation

#### Scenario: Single clear winner
- **WHEN** top recommendation has ACS >= 85 with >15 point lead over second place
- **THEN** may show only top recommendation without alternatives
- **AND** include note: "This is clearly the best fit for your need. Would you like to convert it?"

#### Scenario: ACS dimension visualization
- **WHEN** repository results are shown
- **THEN** display ACS breakdown for context:
  - Show which dimension(s) score highest (e.g., "Strong documentation", "Simple interface")
  - Optionally show radar chart or bar chart of 4 dimensions
- **AND** use color coding or emphasis to highlight why this repo is recommended

## ADDED Requirements

### Requirement: Decision Guidance UI
The system SHALL provide visual and textual cues that guide users toward decisions with minimal cognitive load.

#### Scenario: Progressive disclosure of alternatives
- **WHEN** user is viewing top recommendation
- **THEN** alternatives are initially collapsed or shown in secondary section
- **AND** only expand alternatives when user explicitly requests or scrolls down
- **AND** this reduces decision paralysis from seeing 5 equal options simultaneously

#### Scenario: Comparison helper
- **WHEN** user hovers over or selects an alternative
- **THEN** highlight the **key difference** compared to top recommendation:
  - Different ACS strength
  - Different use case (CLI vs library vs API wrapper)
  - Different integration effort
- **AND** format as: "This repo is stronger at [dimension] but weaker at [dimension]"
