## ADDED Requirements

### Requirement: Phase-Based UI State Management
The system SHALL manage UI state through distinct phases (IDLE, CONSULTATION, DISCOVERY, FABRICATION, DELIVERY) using Zustand store.

#### Scenario: IDLE phase initialization
- **WHEN** user visits the root page with no active conversation
- **THEN** the system SHALL display hero section with large search input
- **AND** the system SHALL show trending skills cards
- **AND** the phase SHALL be set to IDLE

#### Scenario: CONSULTATION phase transition
- **WHEN** user sends first message OR agent asks clarifying question
- **THEN** the system SHALL transition phase to CONSULTATION
- **AND** the system SHALL display conversation blocks (user/agent messages)
- **AND** the system SHALL hide initial view

#### Scenario: DISCOVERY phase transition
- **WHEN** agent calls `findRepository` tool
- **THEN** the system SHALL transition phase to DISCOVERY
- **AND** the system SHALL display ScoutBlock with live search logs
- **AND** the system SHALL stream progress updates

#### Scenario: FABRICATION phase transition
- **WHEN** agent calls `generateSkill` tool OR user clicks "Convert to Skill" button
- **THEN** the system SHALL transition phase to FABRICATION
- **AND** the system SHALL display FabricatorBlock with terminal-style logs
- **AND** the system SHALL show step progress (e.g., "Step 1/4: Analyzing README")

#### Scenario: DELIVERY phase transition
- **WHEN** skill generation completes successfully
- **THEN** the system SHALL transition phase to DELIVERY
- **AND** the system SHALL display SkillDeliveryCard with download button
- **AND** the system SHALL show follow-up suggestion chips

### Requirement: Linear Message Thread Component
The system SHALL provide a linear message thread layout (Claude/Cursor style) for rendering multi-turn dialogue without chat bubbles.

#### Scenario: User message rendering
- **WHEN** user sends message
- **THEN** the system SHALL display message with:
  - Small avatar icon (24x24px, gradient background: #667eea → #764ba2)
  - Role label "You" next to avatar in 14px font-weight 600
  - Message content left-aligned, indented 2.25rem from left
  - No bottom border separator (removed for cleaner look)
- **AND** the message SHALL NOT use chat bubble styling
- **AND** all messages SHALL align to the left side
- **AND** messages SHALL use vertical padding of 1.5rem for spacing

#### Scenario: Agent message rendering
- **WHEN** agent responds without tool call
- **THEN** the system SHALL display message with:
  - Small avatar icon (24x24px, dark background #24292f with robot icon)
  - Role label "Skill Factory Agent" next to avatar in 14px font-weight 600
  - Message content left-aligned, indented 2.25rem from left
  - Support for Markdown formatting (bold #0969da, italic, lists, links)
  - Message font-size: 15px (0.9375rem), line-height: 1.7
- **AND** the message SHALL NOT use chat bubble styling
- **AND** the message SHALL use consistent left alignment
- **AND** messages SHALL use vertical padding of 1.5rem for spacing

#### Scenario: Message spacing and separators
- **WHEN** rendering message thread
- **THEN** each message SHALL have 1.5rem vertical padding (1.5rem 0)
- **AND** messages SHALL use natural spacing without border separators (cleaned up design)
- **AND** message content SHALL be indented 2.25rem from left (aligned with text after avatar)
- **AND** the overall layout creates clear visual separation through spacing and typography alone

#### Scenario: Streaming text effect
- **WHEN** agent streams response tokens
- **THEN** the system SHALL append each token to current message
- **AND** the system SHALL create typewriter effect
- **AND** the system SHALL auto-scroll to keep message visible

#### Scenario: Suggestion buttons display
- **WHEN** agent message includes predefined suggestions
- **THEN** the system SHALL display suggestion buttons below message content
- **AND** buttons SHALL use minimal styling (white background, 1.5px border #e1e4e8, 8px border-radius)
- **AND** buttons SHALL have subtle shadow (0 1px 3px rgba(0,0,0,0.06))
- **AND** buttons SHALL have hover effect (lift 1px, blue border #0969da, blue text #0969da, stronger shadow)
- **AND** each button SHALL be clickable to send as next user message
- **AND** buttons SHALL display horizontally with 0.5rem gap and flex wrap
- **AND** buttons SHALL be indented 2.25rem to align with message content
- **AND** button padding: 0.625rem 1.125rem, font-size: 14px

### Requirement: Agent Log Container Component
The system SHALL provide an inline log container component embedded within agent messages for visualizing pipeline execution.

#### Scenario: Log container as message part
- **WHEN** agent executes Discovery or Fabrication pipeline
- **THEN** the system SHALL render log container as part of agent message (not separate block)
- **AND** the container SHALL be indented 2.25rem to align with message content
- **AND** the container SHALL have white background with 1px gray border (#e1e4e8)
- **AND** the container SHALL have 10px border-radius
- **AND** the container SHALL have subtle shadow (0 2px 6px rgba(0,0,0,0.06))

#### Scenario: Live search logs display
- **WHEN** discovery pipeline is executing
- **THEN** the system SHALL display real-time logs in monospace font
- **AND** the logs SHALL include: "Query Translation", "Scouting GitHub", "Screening & Scoring"
- **AND** each log line SHALL have left border color indicator (3px solid)

#### Scenario: Step indicator styling
- **WHEN** rendering pipeline steps
- **THEN** completed steps SHALL display with:
  - Green left border (#1a7f37)
  - Green step number badge
  - Green step text color
- **AND** active steps SHALL display with:
  - Blue left border (#0969da)
  - Blue step number badge with rotating spinner
  - Blue step text color
- **AND** pending steps SHALL have transparent left border

#### Scenario: Log line metadata display
- **WHEN** displaying log details
- **THEN** each log SHALL show metadata in smaller gray text below main content
- **AND** timestamp SHALL display on the right side
- **AND** log lines SHALL highlight on hover with light gray background

### Requirement: Inline Result Card Component
The system SHALL provide an inline result card component embedded within agent messages for displaying repository results.

#### Scenario: Result card as message part
- **WHEN** discovery returns repository result
- **THEN** the system SHALL render result card as part of agent message (not separate block)
- **AND** the card SHALL be indented 2.25rem to align with message content
- **AND** the card SHALL have white background, 1px border (#d0d7de), 10px border-radius
- **AND** the card SHALL have subtle shadow (0 2px 6px rgba(0,0,0,0.06))

#### Scenario: Repository metadata display
- **WHEN** displaying repository result
- **THEN** the card SHALL show in header section:
  - Repository icon and full name (owner/name) in blue link color
  - Language, license, and stars count in small gray text
- **AND** the card SHALL show in content section:
  - Repository description in regular text
  - 2-column grid for Interface and Documentation quality
  - "Convert to Skill" button with green background

#### Scenario: ACS score visualization
- **WHEN** repository has ACS score
- **THEN** the system SHALL display score in card header right side:
  - "ACS SCORE" label in small uppercase text
  - Large green number (e.g., "94") with "/100" suffix in smaller gray text
- **AND** the score SHALL NOT use gradient badge (use simple text styling)

#### Scenario: Quality indicators display
- **WHEN** showing compatibility breakdown
- **THEN** the system SHALL display 2-column grid with:
  - Left: Interface quality with rating text in green
  - Right: Documentation quality with rating text in green
- **AND** each cell SHALL have light gray background (#f6f8fa) with 1px border

#### Scenario: Convert to Skill action
- **WHEN** user clicks "Convert to Skill" button
- **THEN** the system SHALL add new agent message announcing fabrication start
- **AND** the system SHALL trigger phase transition to FABRICATION
- **AND** the button SHALL use full-width green button styling (#2da44e)

### Requirement: Fabrication Log Container Component
The system SHALL provide a fabrication log container embedded within agent messages for displaying skill generation progress.

#### Scenario: Log container styling
- **WHEN** fabrication pipeline executes
- **THEN** the system SHALL render log container as part of agent message
- **AND** the container SHALL be indented 2.25rem to align with message content
- **AND** the container SHALL use same styling as Discovery logs (white background, not terminal theme)

#### Scenario: Step progress indicator with color coding
- **WHEN** fabrication progresses through steps
- **THEN** completed steps SHALL display with:
  - Green left border, green step badge, green text
  - Step labels: "Initializing", "Analyzing Structure", "Synthesizing Instructions", "Packaging"
- **AND** active step SHALL display with blue styling
- **AND** each step SHALL show metadata (file sizes, token counts) in gray text

#### Scenario: Progress bar display
- **WHEN** fabrication is executing
- **THEN** the system SHALL show 3px progress bar below log header
- **AND** the bar SHALL fill from 0% to 100% as steps complete
- **AND** the bar SHALL use blue gradient background (#0969da → #54aeff)

#### Scenario: Live log streaming
- **WHEN** backend emits fabrication logs
- **THEN** the system SHALL append each log line immediately
- **AND** the system SHALL auto-scroll to bottom
- **AND** the system SHALL limit container height to 300px with scroll

### Requirement: Inline Success Banner Component
The system SHALL provide an inline success banner embedded within agent messages for displaying skill delivery.

#### Scenario: Success banner as message part
- **WHEN** skill generation completes successfully
- **THEN** the system SHALL render success banner as part of agent message
- **AND** the banner SHALL be indented 2.25rem to align with message content
- **AND** the banner SHALL use green gradient background (#dcfce7 → #bbf7d0)

#### Scenario: Success banner layout
- **WHEN** displaying success banner
- **THEN** the banner SHALL show:
  - Left: Round green icon (36px) with white checkmark, has shadow (0 2px 6px rgba(34,197,94,0.3))
  - Center: Title "Skill Generated Successfully!" in dark green (#166534)
  - Center: Description text in medium green (#15803d)
  - Bottom: Two action buttons (Download primary, View Instructions secondary)
- **AND** the banner SHALL have 2px green border (#86efac), 12px border-radius
- **AND** the banner SHALL have gradient background (#dcfce7 → #bbf7d0)
- **AND** the banner SHALL have shadow (0 4px 12px rgba(34,197,94,0.15))
- **AND** the banner SHALL have padding: 1.5rem, margin-top: 1rem

#### Scenario: Download button
- **WHEN** skill artifact is ready
- **THEN** the system SHALL display green "Download [name]-skill.zip" button
- **AND** the button SHALL have background #2da44e, white text, 10px border-radius
- **AND** the button SHALL have shadow (0 2px 8px rgba(45,164,78,0.25))
- **AND** the button SHALL have hover effect (lift 1px, shadow 0 4px 12px rgba(45,164,78,0.35))
- **AND** the button SHALL trigger file download on click
- **AND** the button SHALL show magic wand icon on left side
- **AND** the button SHALL be full-width in success banner

#### Scenario: Secondary actions
- **WHEN** success banner is shown
- **THEN** the system SHALL display "View Instructions" button with:
  - White background
  - Green border (2px solid)
  - Green text color
- **AND** both buttons SHALL display inline (flex layout with gap)

#### Scenario: Follow-up suggestions in message
- **WHEN** skill delivery is complete
- **THEN** agent message below banner SHALL include suggestion buttons:
  - "How do I install this?"
  - "Find more [category] tools"
  - "Start new search"
- **AND** suggestions SHALL use same minimal button styling as other messages

### Requirement: Direct Fabrication Shortcut
The system SHALL support direct skill generation when user provides GitHub URL, skipping discovery phase.

#### Scenario: URL detection in user input
- **WHEN** user message contains GitHub repository URL pattern (`https://github.com/{owner}/{repo}`)
- **THEN** the system SHALL detect URL automatically
- **AND** the system SHALL display confirmation: "Detected repository: {owner}/{repo}. Starting fabrication..."

#### Scenario: Skip to FABRICATION phase
- **WHEN** URL is detected
- **THEN** the system SHALL skip CONSULTATION and DISCOVERY phases
- **AND** the system SHALL transition directly to FABRICATION phase
- **AND** the system SHALL call `generateSkill` tool with extracted URL

#### Scenario: Named repository detection
- **WHEN** user mentions specific tool name (e.g., "Make a skill for yt-dlp")
- **AND** agent can infer GitHub repository from context
- **THEN** the system SHALL ask confirmation: "Do you mean yt-dlp/yt-dlp?"
- **IF** user confirms, transition to FABRICATION

### Requirement: Linear Thread Streaming Integration
The system SHALL integrate with Consultant Agent API using Vercel AI SDK's `useChat` hook for linear message thread streaming.

#### Scenario: useChat hook configuration
- **WHEN** page component initializes
- **THEN** the system SHALL configure `useChat` with:
  - API endpoint: `/api/consultant`
  - Auto-scroll: enabled
  - Initial messages: empty array
- **AND** the hook SHALL provide: `messages`, `input`, `handleSubmit`, `isLoading`

#### Scenario: Message rendering in linear thread
- **WHEN** receiving streamed messages
- **THEN** the system SHALL render each message with:
  - Avatar icon (24x24px) and role label in header
  - Message content indented 2.25rem from left
  - Bottom border separator (1px solid #e5e7eb)
- **AND** user messages and agent messages SHALL use same left-aligned layout
- **AND** no chat bubble styling SHALL be applied

#### Scenario: Tool call event handling
- **WHEN** agent invokes tool during streaming
- **THEN** the system SHALL add new agent message announcing tool execution
- **AND** the message SHALL embed log container component
- **AND** the system SHALL trigger phase transition based on tool:
  - `findRepository` → DISCOVERY (show Discovery logs)
  - `generateSkill` → FABRICATION (show Fabrication logs)

#### Scenario: Tool result rendering inline
- **WHEN** tool execution completes
- **THEN** the system SHALL add new agent message with result
- **AND** the message SHALL embed result-specific component:
  - `findRepository` → Inline result card with ACS score
  - `generateSkill` → Inline success banner
- **AND** all embedded components SHALL be indented 2.25rem

#### Scenario: Error handling in linear thread
- **WHEN** streaming connection fails OR timeout occurs
- **THEN** the system SHALL add agent message with error description
- **AND** the message SHALL include suggestion button "Retry"
- **AND** error SHALL be logged for debugging

### Requirement: Auto-Scroll Behavior
The system SHALL automatically scroll to keep latest message visible during streaming and phase transitions.

#### Scenario: Scroll during text streaming
- **WHEN** agent message is being streamed
- **THEN** the system SHALL keep message bottom visible
- **AND** scroll SHALL be smooth (not jumpy)
- **AND** scroll SHALL not interrupt if user manually scrolled up

#### Scenario: Scroll on phase transition
- **WHEN** phase changes (e.g., CONSULTATION → DISCOVERY)
- **THEN** the system SHALL scroll to show new phase component
- **AND** scroll animation SHALL take 300ms
- **AND** scroll SHALL center new component in viewport

#### Scenario: Manual scroll override
- **WHEN** user manually scrolls up to read previous messages
- **THEN** the system SHALL pause auto-scroll
- **AND** the system SHALL show "Scroll to bottom" button at bottom-right
- **WHEN** user clicks button OR scrolls to bottom manually
- **THEN** auto-scroll SHALL resume

## MODIFIED Requirements

### Requirement: Fixed Bottom Input Area
The system SHALL provide a fixed bottom input area for message submission throughout the conversation.

#### Scenario: Initial screen prompt examples
- **WHEN** user is in IDLE phase
- **THEN** the system SHALL display centered initial screen with:
  - Large title "What skill do you need today?"
  - Subtitle with description
  - 3 example prompt cards in grid layout
- **AND** each example card SHALL be clickable to auto-fill input

#### Scenario: Fixed input area layout
- **WHEN** user starts conversation
- **THEN** the system SHALL show fixed input area at bottom of viewport with:
  - Floating input box design (no full-width background bar)
  - Gradient backdrop (from #f6f8fa bottom to transparent top) using background-gradient
  - Centered container (max-width: 900px)
  - Auto-resizing textarea (starts at 1 row, min-height: dynamic)
  - Dark "Send" button on right side
- **AND** the input area SHALL remain fixed during scroll
- **AND** the input field SHALL have:
  - White background, 12px border-radius, 1.5px border (#d0d7de)
  - Padding: 0.875rem 1.125rem
  - Shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)
  - Focus state: blue border (#0969da), stronger shadow, lift 1px
  - Font-size: 15px (0.9375rem)
- **AND** the Send button SHALL have:
  - Background #24292f, white text, 12px border-radius
  - Padding: 0.875rem 1.5rem
  - Shadow: 0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)
  - Hover effect: background #1c2127, lift 1px, stronger shadow
  - Active/Press effect: return to baseline (no lift)

#### Scenario: Input submission behavior
- **WHEN** user types in textarea
- **THEN** Enter key SHALL submit message (Shift+Enter for new line)
- **AND** textarea SHALL auto-resize vertically as content grows
- **WHEN** user clicks "Send" button
- **THEN** the system SHALL add user message to thread
- **AND** the system SHALL clear input field
- **AND** the system SHALL show typing indicator in agent message

#### Scenario: Example card interaction
- **WHEN** user clicks example card in IDLE phase
- **THEN** the system SHALL auto-fill input with example text
- **AND** the system SHALL automatically submit message
- **AND** the system SHALL transition to conversation thread view

### Requirement: Visual Design System - Background and Glassmorphism
The system SHALL implement a sophisticated multi-layer background with glassmorphic (frosted glass) effect for modern, premium aesthetic.

#### Scenario: Page background layers
- **WHEN** page loads
- **THEN** the system SHALL render body background with 6 layers (from front to back):
  1. **Point Grid**: 20px × 20px pattern of 1px dots, `rgba(0,0,0,0.035)` opacity
  2. **Large Grid Horizontal**: 80px × 80px pattern of 1px lines, `rgba(0,0,0,0.02)` opacity
  3. **Large Grid Vertical**: 80px × 80px pattern of 1px lines, `rgba(0,0,0,0.02)` opacity (crosses horizontal grid)
  4. **Top Brand Glow**: 1200px × 500px ellipse at top center, `rgba(9,105,218,0.05)` (GitHub blue)
  5. **Bottom Soft Glow**: 800px × 400px ellipse at bottom center, `rgba(100,116,139,0.03)` (neutral gray)
  6. **Base Gradient**: 5-segment vertical gradient (#f5f7f9 → #f8f9fb → #fafbfc → #f7f9fa → #f5f6f8)
- **AND** background SHALL be fixed (does not scroll) using `background-attachment: fixed`

#### Scenario: Content area glassmorphism
- **WHEN** rendering main content container
- **THEN** the system SHALL apply glassmorphic effect with:
  - Semi-transparent white background: `rgba(255,255,255,0.6)`
  - Blur filter: `backdrop-filter: blur(10px)`
  - Subtle border: `box-shadow: 0 0 0 1px rgba(0,0,0,0.03)`
- **AND** this creates effect of content "floating" above background
- **AND** grid patterns and color gradients are visible through content area

#### Scenario: Sticky header glassmorphism
- **WHEN** header is positioned at top of page
- **THEN** the system SHALL apply enhanced glassmorphic effect with:
  - More transparent white: `rgba(255,255,255,0.8)`
  - Stronger blur: `backdrop-filter: blur(12px)`
  - Fine border: `border-bottom: 1px solid rgba(0,0,0,0.04)`
  - Light shadow: `box-shadow: 0 1px 3px rgba(0,0,0,0.05)`
- **AND** this maintains readability while showing background textures

### Requirement: Micro-Interaction and Motion Design
The system SHALL provide smooth, purposeful animations for all interactive elements.

#### Scenario: Button hover and interaction states
- **WHEN** user hovers over any button (suggestion, send, download, etc.)
- **THEN** the system SHALL apply:
  - Upward translation: `transform: translateY(-1px)`
  - Enhanced shadow: stronger shadow version of base shadow
  - Border/color change if applicable (e.g., blue border on suggestion button hover)
- **AND** transition SHALL use smooth easing: `cubic-bezier(0.4, 0, 0.2, 1)` (Apple standard curve)
- **AND** transition duration SHALL be 0.2s
- **AND** on press/active state, translate SHALL return to 0 (no lift)

#### Scenario: Input field focus state
- **WHEN** user focuses on textarea input
- **THEN** the system SHALL apply:
  - Border color change: from #d0d7de to #0969da (blue)
  - Enhanced shadow: `0 4px 12px rgba(9,105,218,0.15), 0 2px 4px rgba(9,105,218,0.1)`
  - Upward lift: `transform: translateY(-1px)`
- **AND** transition SHALL be smooth: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- **AND** user SHALL see clear focus indication

#### Scenario: Message fade-in animation
- **WHEN** new message appears
- **THEN** the system SHALL animate with:
  - Fade-in: opacity 0 → 1
  - Slide-up: translateY(10px) → translateY(0)
  - Duration: 0.3s ease-out
- **AND** animation creates smooth appearance

## REMOVED Requirements

None - this change is purely additive to existing frontend-ui spec.
