# Capability: Frontend UI

## ADDED Requirements

### Requirement: Next.js Application Structure
The system SHALL provide a Next.js 15 application with App Router, TypeScript, and Tailwind CSS configured for oh-my-github frontend development.

#### Scenario: Development server startup
- **WHEN** developer runs `bun run dev`
- **THEN** the application SHALL start on http://localhost:3000
- **AND** no build errors SHALL be displayed
- **AND** hot module replacement SHALL work for component changes

#### Scenario: Production build
- **WHEN** developer runs `bun run build`
- **THEN** the application SHALL compile without TypeScript errors
- **AND** the output SHALL be generated in `.next/` directory
- **AND** the build SHALL complete in less than 60 seconds for initial build

### Requirement: Tailwind CSS Configuration
The system SHALL configure Tailwind CSS with GitHub Primer design system colors and typography.

#### Scenario: GitHub Primer colors available
- **WHEN** developer uses Tailwind class `bg-github-canvas`
- **THEN** the element SHALL have background color `#ffffff`
- **WHEN** developer uses class `text-github-primary`
- **THEN** the element SHALL have text color `#2da44e`
- **AND** all Primer color tokens SHALL be available: `github-canvas`, `github-primary`, `github-border`, `github-text`

#### Scenario: System font stack applied
- **WHEN** no custom font family is specified
- **THEN** the application SHALL use system UI fonts
- **AND** the font stack SHALL include: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`

### Requirement: Shadcn/ui Component Library Integration
The system SHALL integrate Shadcn/ui components for building consistent, accessible UI elements.

#### Scenario: Core components available
- **WHEN** developer imports component from `@/components/ui/button`
- **THEN** the Button component SHALL be available
- **AND** the component SHALL support Shadcn/ui variants (default, destructive, outline, secondary, ghost, link)
- **WHEN** developer imports Input, Card, or Badge components
- **THEN** all SHALL be available from `@/components/ui/*`

#### Scenario: Component customization
- **WHEN** developer modifies a component in `components/ui/`
- **THEN** changes SHALL persist (components are copied, not npm-installed)
- **AND** the component SHALL maintain accessibility features from Radix UI primitives

### Requirement: Repository Analysis Input Form
The system SHALL provide a form component for users to input GitHub repository identifiers and trigger analysis.

#### Scenario: Valid repository input
- **WHEN** user enters "facebook/react" in the repository input field
- **AND** user clicks the "Analyze" button
- **THEN** the form SHALL validate the format (owner/name pattern)
- **AND** the form SHALL submit a POST request to `/api/analyze`
- **AND** the form SHALL display a loading indicator during request

#### Scenario: Invalid repository format
- **WHEN** user enters "invalid-format" (no slash)
- **AND** user clicks "Analyze"
- **THEN** the form SHALL display an error message: "Invalid format. Use owner/name (e.g., facebook/react)"
- **AND** the form SHALL NOT submit the API request

#### Scenario: API error handling
- **WHEN** the API returns an error response
- **THEN** the form SHALL display the error message below the input field
- **AND** the form SHALL exit loading state
- **AND** the user SHALL be able to retry

### Requirement: Analysis Report Display
The system SHALL render LLM-generated Markdown reports with formatted content and metadata.

#### Scenario: Markdown report rendering
- **WHEN** the API returns a successful analysis response
- **THEN** the system SHALL render the report content as formatted Markdown
- **AND** the rendering SHALL support: headers, bold, italic, lists, code blocks, tables
- **AND** the rendering SHALL apply GitHub-style typography

#### Scenario: Token usage display
- **WHEN** a report is displayed
- **THEN** the system SHALL show a badge with token count
- **AND** the badge SHALL show estimated cost in USD
- **AND** the format SHALL be: "Tokens: 1,187 | Cost: $0.0008"

#### Scenario: Validation warnings
- **WHEN** the report validation indicates issues (`isValid: false`)
- **THEN** the system SHALL display a warning indicator (⚠️)
- **AND** the system SHALL show validation error details
- **AND** the report SHALL still be displayed (partial success)

### Requirement: Responsive Layout System (Option B Only)
The system SHALL provide a two-panel workspace layout with resizable chat sidebar and canvas area.

*Note: This requirement is only implemented if Option B (Complete UI Foundation) is chosen.*

#### Scenario: Split panel layout
- **WHEN** user visits `/workspace` page
- **THEN** the page SHALL display a two-panel layout
- **AND** the left panel SHALL occupy 30% width (chat sidebar)
- **AND** the right panel SHALL occupy 70% width (canvas area)
- **AND** the layout SHALL adapt to window resize

#### Scenario: Chat sidebar placeholder
- **WHEN** the left panel is rendered
- **THEN** the panel SHALL display placeholder text: "Chat Interface (Coming Soon)"
- **AND** the panel SHALL have a right border
- **AND** the panel SHALL use GitHub border color (`github-border`)

#### Scenario: Canvas area with repository cards
- **WHEN** the right panel is rendered
- **THEN** the panel SHALL display a heading "Trending Alphas" or equivalent
- **AND** the panel SHALL render sample repository cards
- **AND** each card SHALL display: repo name, description, tech stack badges

### Requirement: Navigation and Routing (Option B Only)
The system SHALL support multi-page navigation between landing page and workspace.

*Note: This requirement is only implemented if Option B is chosen.*

#### Scenario: Landing page navigation
- **WHEN** user visits the root URL `/`
- **THEN** the landing page SHALL display with hero input section
- **AND** a "Go to Workspace" button SHALL be available
- **WHEN** user clicks the button
- **THEN** the browser SHALL navigate to `/workspace`

#### Scenario: Workspace navigation
- **WHEN** user is on `/workspace`
- **THEN** a navigation header SHALL display
- **AND** a "Home" link SHALL navigate to `/`
- **AND** a "Workspace" link SHALL navigate to `/workspace`

#### Scenario: Route persistence
- **WHEN** user refreshes the page on any route
- **THEN** the current route SHALL be maintained
- **AND** the page SHALL render without errors

### Requirement: Static Asset Management
The system SHALL serve static assets (images, fonts, icons) from the public directory.

#### Scenario: Public directory access
- **WHEN** a file is placed in `/public/logo.png`
- **THEN** the file SHALL be accessible at `/logo.png` URL
- **AND** the file SHALL be served with appropriate MIME type

#### Scenario: Next.js Image optimization
- **WHEN** developer uses Next.js `<Image>` component
- **THEN** images SHALL be automatically optimized
- **AND** images SHALL support lazy loading
- **AND** responsive srcset SHALL be generated

### Requirement: Environment-Specific Styling
The system SHALL apply consistent styling across all pages with GitHub-inspired design patterns.

#### Scenario: Global styles application
- **WHEN** any page loads
- **THEN** global CSS SHALL be applied from `app/globals.css`
- **AND** Tailwind base, components, and utilities SHALL be included
- **AND** custom GitHub color scheme SHALL be available

#### Scenario: Component-specific styles
- **WHEN** a component uses scoped styles
- **THEN** styles SHALL not leak to other components
- **AND** Tailwind classes SHALL take precedence over custom CSS

### Requirement: Error Boundary and Loading States
The system SHALL provide user feedback during loading and error states.

#### Scenario: Loading state display
- **WHEN** an API request is in progress
- **THEN** the UI SHALL display a loading indicator
- **AND** the submit button SHALL be disabled
- **AND** the button text SHALL change to "Analyzing..." or show a spinner

#### Scenario: Error state display
- **WHEN** an error occurs during analysis
- **THEN** the error message SHALL be displayed in red text
- **AND** the error SHALL be dismissible or auto-clear on next submit
- **AND** the form SHALL remain functional for retry

#### Scenario: Success state transition
- **WHEN** analysis completes successfully
- **THEN** the loading state SHALL clear
- **AND** the report SHALL be displayed
- **AND** an "Analyze Another" action SHALL be available

---

## Capability Metadata

- **Owner**: Frontend Team
- **Status**: Proposed (Proposal 3)
- **Dependencies**: None (greenfield)
- **Related Capabilities**: `api-routes` (backend counterpart)
