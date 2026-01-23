import { create } from 'zustand';
import { Phase, ScoredRepository, SkillArtifact, LogEntry, ToolCallMetadata } from '@/lib/types/chat';

interface ChatStore {
  // Phase state
  currentPhase: Phase;
  setPhase: (phase: Phase) => void;

  // Tool call state
  activeToolCall: ToolCallMetadata | null;
  setActiveToolCall: (toolCall: ToolCallMetadata | null) => void;
  toolResults: Record<string, unknown>;
  setToolResult: (toolName: string, result: unknown) => void;

  // Discovery phase state
  discoveryLogs: LogEntry[];
  addDiscoveryLog: (message: string, type?: LogEntry['type']) => void;
  clearDiscoveryLogs: () => void;

  // Fabrication phase state
  fabricationLogs: LogEntry[];
  addFabricationLog: (message: string, type?: LogEntry['type']) => void;
  clearFabricationLogs: () => void;

  // ACS scores from discovery
  acsScores: ScoredRepository[];
  setACSScores: (scores: ScoredRepository[]) => void;

  // Skill artifact from fabrication
  skillArtifact: SkillArtifact | null;
  setSkillArtifact: (artifact: SkillArtifact | null) => void;

  // Reset entire store
  reset: () => void;
}

const initialState = {
  currentPhase: 'IDLE' as Phase,
  activeToolCall: null,
  toolResults: {},
  discoveryLogs: [],
  fabricationLogs: [],
  acsScores: [],
  skillArtifact: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  setPhase: (phase: Phase) => set({ currentPhase: phase }),

  setActiveToolCall: (toolCall: ToolCallMetadata | null) =>
    set({ activeToolCall: toolCall }),

  setToolResult: (toolName: string, result: unknown) =>
    set((state) => ({
      toolResults: { ...state.toolResults, [toolName]: result },
    })),

  addDiscoveryLog: (message: string, type: LogEntry['type'] = 'info') =>
    set((state) => ({
      discoveryLogs: [
        ...state.discoveryLogs,
        {
          id: `log-${Date.now()}-${Math.random()}`,
          message,
          timestamp: Date.now(),
          type,
        },
      ],
    })),

  clearDiscoveryLogs: () => set({ discoveryLogs: [] }),

  addFabricationLog: (message: string, type: LogEntry['type'] = 'info') =>
    set((state) => ({
      fabricationLogs: [
        ...state.fabricationLogs,
        {
          id: `log-${Date.now()}-${Math.random()}`,
          message,
          timestamp: Date.now(),
          type,
        },
      ],
    })),

  clearFabricationLogs: () => set({ fabricationLogs: [] }),

  setACSScores: (scores: ScoredRepository[]) => set({ acsScores: scores }),

  setSkillArtifact: (artifact: SkillArtifact | null) =>
    set({ skillArtifact: artifact }),

  reset: () => set(initialState),
}));
