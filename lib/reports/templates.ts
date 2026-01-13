/**
 * Report template structure for hybrid rendering
 */
export interface ReportTemplate {
  name: string;
  description: string;
  sections: ReportSection[];
}

/**
 * Report section configuration
 */
export interface ReportSection {
  id: string;
  title: string;
  type: "metric" | "llm-analysis" | "hybrid";
  required: boolean;
  order: number;
}

/**
 * Default contribution analysis template
 * Defines the structure for repository contribution analysis reports
 */
export const DEFAULT_CONTRIBUTION_ANALYSIS_TEMPLATE: ReportTemplate = {
  name: "Contribution Analysis",
  description:
    "Comprehensive analysis of repository contribution opportunities and project health",
  sections: [
    {
      id: "summary",
      title: "Executive Summary",
      type: "llm-analysis",
      required: true,
      order: 1,
    },
    {
      id: "metrics",
      title: "Key Metrics",
      type: "metric",
      required: false,
      order: 2,
    },
    {
      id: "activity",
      title: "Activity Analysis",
      type: "llm-analysis",
      required: true,
      order: 3,
    },
    {
      id: "contribution",
      title: "Contribution Opportunities",
      type: "llm-analysis",
      required: true,
      order: 4,
    },
    {
      id: "onboarding",
      title: "Onboarding Assessment",
      type: "llm-analysis",
      required: true,
      order: 5,
    },
    {
      id: "recommendations",
      title: "Recommendations",
      type: "llm-analysis",
      required: true,
      order: 6,
    },
  ],
};

/**
 * Brief analysis template for quick overviews
 * Focused on essential information only
 */
export const BRIEF_ANALYSIS_TEMPLATE: ReportTemplate = {
  name: "Brief Analysis",
  description: "Quick overview of repository health and contribution potential",
  sections: [
    {
      id: "summary",
      title: "Summary",
      type: "llm-analysis",
      required: true,
      order: 1,
    },
    {
      id: "contribution",
      title: "Top Contribution Opportunity",
      type: "llm-analysis",
      required: true,
      order: 2,
    },
    {
      id: "recommendations",
      title: "Next Steps",
      type: "llm-analysis",
      required: true,
      order: 3,
    },
  ],
};

/**
 * Comparative analysis template for multiple repositories
 */
export const COMPARATIVE_ANALYSIS_TEMPLATE: ReportTemplate = {
  name: "Comparative Analysis",
  description: "Side-by-side comparison of multiple repositories",
  sections: [
    {
      id: "summary",
      title: "Comparison Summary",
      type: "llm-analysis",
      required: true,
      order: 1,
    },
    {
      id: "metrics",
      title: "Metrics Comparison",
      type: "metric",
      required: true,
      order: 2,
    },
    {
      id: "strengths",
      title: "Relative Strengths",
      type: "llm-analysis",
      required: true,
      order: 3,
    },
    {
      id: "recommendations",
      title: "Repository Selection Guidance",
      type: "llm-analysis",
      required: true,
      order: 4,
    },
  ],
};

/**
 * Gets a template by name
 * @param name - Template name (default, brief, comparative)
 * @returns Report template
 */
export function getTemplate(name: string): ReportTemplate {
  switch (name.toLowerCase()) {
    case "default":
    case "contribution":
      return DEFAULT_CONTRIBUTION_ANALYSIS_TEMPLATE;
    case "brief":
      return BRIEF_ANALYSIS_TEMPLATE;
    case "comparative":
    case "comparison":
      return COMPARATIVE_ANALYSIS_TEMPLATE;
    default:
      throw new Error(
        `Unknown template: ${name}. Available templates: default, brief, comparative`
      );
  }
}

/**
 * Validates that required sections are present in analysis data
 * @param template - Report template
 * @param availableSections - Available section IDs from analysis
 * @returns Validation result with missing sections
 */
export function validateTemplateSections(
  template: ReportTemplate,
  availableSections: string[]
): { isValid: boolean; missingSections: string[] } {
  const requiredSections = template.sections
    .filter((s) => s.required)
    .map((s) => s.id);

  const missingSections = requiredSections.filter(
    (id) => !availableSections.includes(id)
  );

  return {
    isValid: missingSections.length === 0,
    missingSections,
  };
}

/**
 * Sorts sections according to template order
 * @param template - Report template
 * @returns Sorted section IDs
 */
export function getSectionOrder(template: ReportTemplate): string[] {
  return template.sections
    .sort((a, b) => a.order - b.order)
    .map((s) => s.id);
}
