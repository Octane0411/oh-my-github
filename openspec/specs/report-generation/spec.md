# report-generation Specification

## Purpose
TBD - created by archiving change add-llm-analysis-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Structured Report Generation
The system SHALL generate structured Markdown reports from repository analysis results.

#### Scenario: Generate comprehensive analysis report
- **WHEN** provided with repository metadata and LLM analysis
- **THEN** generate a Markdown report with sections: Summary, Activity Analysis, Contribution Opportunities, Onboarding Assessment, and Recommendations

#### Scenario: Include metrics visualization
- **WHEN** generating report
- **THEN** include formatted Markdown tables for key metrics (PR merge rate, issue response time, etc.)
- **NOTE** Advanced visualizations (charts, graphs) are out of scope for MVP

#### Scenario: Generate comparison reports
- **WHEN** analyzing multiple repositories
- **THEN** generate a comparative report highlighting relative strengths and trade-offs

### Requirement: Report Sections and Structure
The system SHALL organize reports into standardized sections, combining pre-calculated metrics with LLM interpretation.

#### Scenario: Executive summary section
- **WHEN** generating report
- **THEN** include a 2-3 sentence executive summary at the top with key takeaways

#### Scenario: Activity metrics section
- **WHEN** including activity analysis
- **THEN** display pre-calculated metrics (commit frequency, issue response time) injected via template
- **AND** include LLM-generated interpretation of these trends

#### Scenario: Contribution opportunities section
- **WHEN** analyzing contribution potential
- **THEN** analyze a pre-filtered list of issues (including unlabelled ones) to suggest entry points
- **AND** highlight specific issues that appear suitable for new contributors regardless of labels

#### Scenario: Risk and concerns section
- **WHEN** identifying potential issues
- **THEN** clearly document concerns (low activity, poor documentation, high rejection rate) with mitigation suggestions

#### Scenario: Actionable recommendations section
- **WHEN** concluding report
- **THEN** provide 3-5 specific, actionable next steps for potential contributors

### Requirement: Report Customization
The system SHALL support customizable report formats and detail levels.

#### Scenario: Brief vs detailed reports
- **WHEN** user specifies report detail level
- **THEN** adjust content depth accordingly (brief: highlights only, detailed: full analysis)

#### Scenario: Export format options
- **WHEN** generating report
- **THEN** support output in Markdown (default), plain text, and structured JSON formats

### Requirement: Report Metadata
The system SHALL include metadata about the analysis process in reports.

#### Scenario: Analysis metadata header
- **WHEN** generating report
- **THEN** include header with: repository name, analysis date, LLM provider used, token usage, and data freshness

#### Scenario: Confidence indicators
- **WHEN** presenting analysis conclusions
- **THEN** include confidence levels or caveats where data is incomplete or uncertain

### Requirement: Report Templates
The system SHALL use a hybrid templating approach to ensure data accuracy.

#### Scenario: Default analysis template
- **WHEN** no custom template specified
- **THEN** use the default contribution analysis template with all standard sections

#### Scenario: Hybrid variable injection
- **WHEN** rendering report from template
- **THEN** directly inject pre-calculated metrics into template placeholders (ensuring 100% accuracy)
- **AND** inject LLM-generated analysis text blocks into corresponding sections

### Requirement: Report Validation
The system SHALL validate generated reports for completeness and formatting.

#### Scenario: Section completeness check
- **WHEN** report generation completes
- **THEN** verify all required sections are present and non-empty

#### Scenario: Markdown syntax validation
- **WHEN** generating Markdown output
- **THEN** ensure proper heading hierarchy, list formatting, and link syntax

