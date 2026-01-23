/**
 * Phase enum for Skill Factory conversation flow
 */
export type Phase = 'IDLE' | 'CONSULTATION' | 'DISCOVERY' | 'FABRICATION' | 'DELIVERY';

/**
 * ACS (Agent-Compatible Score) breakdown
 */
export interface ACSScore {
  total: number; // 0-100
  interface: number; // Interface quality score
  documentation: number; // Documentation quality score
  complexity: number; // Complexity score
}

/**
 * Repository card with ACS scoring
 */
export interface ScoredRepository {
  owner: string;
  name: string;
  fullName: string; // e.g., "facebook/react"
  description?: string;
  url: string;
  stars: number;
  language?: string; // Primary programming language
  acsScore: ACSScore;
  reasoningText?: string; // Why this repo was selected
}

/**
 * Skill artifact delivered to user
 */
export interface SkillArtifact {
  name: string;
  description: string;
  repository: {
    owner: string;
    name: string;
    url: string;
  };
  content: string; // Skill file content (markdown)
  instructions: string[]; // Usage instructions
  createdAt: string;
}

/**
 * Log entry for discovery/fabrication phases
 */
export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'error' | 'warning';
}

/**
 * Tool call metadata from streaming response
 */
export interface ToolCallMetadata {
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
}
