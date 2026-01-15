import type { Report, ReportMetadata } from "./generator";

/**
 * Report validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Section validation details
 */
interface SectionValidation {
  sectionName: string;
  isPresent: boolean;
  isEmpty: boolean;
}

/**
 * Validates a generated report for completeness and formatting
 * @param report - Report to validate
 * @returns Validation result with errors and warnings
 */
export function validateReport(report: Report): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate metadata
  if (!report.metadata) {
    errors.push("Report metadata is missing");
  } else {
    if (!report.metadata.repositoryName) {
      errors.push("Repository name is missing from metadata");
    }
    if (!report.metadata.analysisDate) {
      errors.push("Analysis date is missing from metadata");
    }
    if (!report.metadata.llmProvider) {
      warnings.push("LLM provider is missing from metadata");
    }
  }

  // Validate content
  if (!report.content || report.content.trim() === "") {
    errors.push("Report content is empty");
    return { isValid: false, errors, warnings };
  }

  // Format-specific validation
  if (report.format === "markdown") {
    const mdValidation = validateMarkdownReport(report.content);
    errors.push(...mdValidation.errors);
    warnings.push(...mdValidation.warnings);
  } else if (report.format === "json") {
    const jsonValidation = validateJSONReport(report.content);
    errors.push(...jsonValidation.errors);
    warnings.push(...jsonValidation.warnings);
  }

  // Check section completeness
  const sectionValidation = validateSectionCompleteness(report.content);
  errors.push(...sectionValidation.errors);
  warnings.push(...sectionValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates Markdown-specific formatting
 * @param content - Markdown content
 * @returns Validation result
 */
function validateMarkdownReport(content: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for proper heading hierarchy
  const headings = content.match(/^#{1,6}\s+.+$/gm);
  if (!headings || headings.length === 0) {
    warnings.push("No headings found in Markdown report");
  } else {
    // Validate heading levels (should start with # and not skip levels)
    const levels = headings.map((h) => h.match(/^#+/)?.[0].length || 0);
    const firstLevel = levels[0];
    if (firstLevel !== 1) {
      warnings.push(
        `First heading should be level 1 (got level ${firstLevel})`
      );
    }
  }

  // Check for broken links (basic validation)
  const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
  if (links) {
    links.forEach((link) => {
      const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const url = match[2];
        if (url && (url.trim() === "" || url === "#")) {
          warnings.push(`Broken or empty link: ${link}`);
        }
      }
    });
  }

  // Check for malformed tables
  const tables = content.match(/\|(.+)\|/g);
  if (tables && tables.length > 0) {
    let inTable = false;
    let columnCount = 0;

    content.split("\n").forEach((line, idx) => {
      if (line.includes("|")) {
        const cols = line.split("|").filter((c) => c.trim() !== "").length;

        if (!inTable) {
          inTable = true;
          columnCount = cols;
        } else if (cols !== columnCount && !line.includes("---")) {
          warnings.push(
            `Table row ${idx + 1} has inconsistent column count (expected ${columnCount}, got ${cols})`
          );
        }
      } else if (inTable && line.trim() === "") {
        inTable = false;
      }
    });
  }

  return { errors, warnings };
}

/**
 * Validates JSON-specific formatting
 * @param content - JSON content
 * @returns Validation result
 */
function validateJSONReport(content: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(content);

    // Check for expected structure
    if (!parsed.metadata) {
      errors.push("JSON report missing 'metadata' field");
    }
    if (!parsed.analysis) {
      errors.push("JSON report missing 'analysis' field");
    }
  } catch (error) {
    errors.push(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { errors, warnings };
}

/**
 * Validates section completeness
 * @param content - Report content
 * @returns Validation result
 */
function validateSectionCompleteness(content: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Define required sections
  const requiredSections = [
    { name: "Summary", pattern: /##?\s+.*summary/i },
    { name: "Recommendations", pattern: /##?\s+.*recommendations?/i },
  ];

  const optionalSections = [
    { name: "Activity Analysis", pattern: /##?\s+.*activity/i },
    { name: "Contribution Opportunities", pattern: /##?\s+.*contribution/i },
    { name: "Onboarding Assessment", pattern: /##?\s+.*onboarding/i },
  ];

  // Check required sections
  requiredSections.forEach((section) => {
    if (!section.pattern.test(content)) {
      errors.push(`Required section missing: ${section.name}`);
    } else {
      // Check if section is empty
      const sectionMatch = content.match(
        new RegExp(section.pattern.source + "[\\s\\S]*?(?=##|$)", "i")
      );
      if (sectionMatch) {
        const sectionContent = sectionMatch[0]
          .replace(section.pattern, "")
          .trim();
        if (sectionContent.length < 10) {
          warnings.push(`Section appears empty or too short: ${section.name}`);
        }
      }
    }
  });

  // Check optional sections (warnings only)
  optionalSections.forEach((section) => {
    if (!section.pattern.test(content)) {
      warnings.push(`Optional section missing: ${section.name}`);
    }
  });

  return { errors, warnings };
}

/**
 * Validates report metadata specifically
 * @param metadata - Report metadata
 * @returns Validation result
 */
export function validateMetadata(metadata: ReportMetadata): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!metadata.repositoryName || metadata.repositoryName.trim() === "") {
    errors.push("Repository name is required");
  }

  if (!metadata.analysisDate) {
    errors.push("Analysis date is required");
  } else {
    // Validate date format
    const date = new Date(metadata.analysisDate);
    if (isNaN(date.getTime())) {
      errors.push("Invalid analysis date format");
    }
  }

  if (!metadata.llmProvider || metadata.llmProvider.trim() === "") {
    warnings.push("LLM provider should be specified");
  }

  if (!metadata.tokenUsage) {
    warnings.push("Token usage information is missing");
  } else {
    if (
      typeof metadata.tokenUsage.totalTokens !== "number" ||
      metadata.tokenUsage.totalTokens < 0
    ) {
      warnings.push("Invalid token usage count");
    }
  }

  // Check for partial result indicators
  if (metadata.isPartial && !metadata.availableSections) {
    warnings.push(
      "Partial result flagged but no available sections specified"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates Markdown syntax (basic check)
 * @param markdown - Markdown content
 * @returns Validation result
 */
export function validateMarkdownSyntax(markdown: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unclosed code blocks
  const codeBlockMatches = markdown.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    errors.push("Unclosed code block detected");
  }

  // Check for unclosed bold/italic
  const boldMatches = markdown.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 !== 0) {
    warnings.push("Unmatched bold marker (**) detected");
  }

  const italicMatches = markdown.match(/(?<!\*)\*(?!\*)/g);
  if (italicMatches && italicMatches.length % 2 !== 0) {
    warnings.push("Unmatched italic marker (*) detected");
  }

  // Check for proper list formatting
  const lines = markdown.split("\n");
  lines.forEach((line, idx) => {
    // Check for list items without proper spacing
    if (/^[-*+]\S/.test(line)) {
      warnings.push(
        `List item at line ${idx + 1} should have space after marker`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
