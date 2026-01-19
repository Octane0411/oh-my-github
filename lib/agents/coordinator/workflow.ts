/**
 * Coordinator Workflow
 *
 * LangGraph workflow that orchestrates all agents:
 * 1. Coordinator Node (classify intent)
 * 2. Agent Nodes (search_team, auditor, comparator, companion, clarifier)
 * 3. Synthesizer Node (generate summary and suggestions)
 *
 * Flow:
 * START → coordinator → [conditional routing based on intent] → synthesizer → END
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state";
import { coordinatorNode } from "./coordinator-node";
import { searchTeamNode } from "./search-team-node";
import { synthesizerNode } from "./synthesizer-node";
import type { Intent } from "./types";

/**
 * Stub agent nodes (to be implemented in future proposals)
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function stubAuditorNode(_state: AgentStateType): Promise<Partial<AgentStateType>> {
  return {
    structuredData: null,
    error: "Auditor agent not yet implemented (coming in Proposal 10)",
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function stubComparatorNode(_state: AgentStateType): Promise<Partial<AgentStateType>> {
  return {
    structuredData: null,
    error: "Comparator agent not yet implemented (future proposal)",
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function stubCompanionNode(_state: AgentStateType): Promise<Partial<AgentStateType>> {
  return {
    structuredData: null,
    error: "Companion agent not yet implemented (future proposal)",
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function stubClarifierNode(_state: AgentStateType): Promise<Partial<AgentStateType>> {
  // Simple clarification implementation
  return {
    structuredData: {
      type: "clarification",
      question: "I'm not sure what you're asking. Could you clarify?",
      options: [
        "Search for repositories",
        "Analyze a specific repository",
        "Compare multiple repositories",
      ],
      context: "Please select one of the options below or rephrase your question.",
    },
  };
}

/**
 * Routing function based on intent
 */
function routeByIntent(state: AgentStateType): string {
  const intent = state.intent;

  const routes: Record<Intent, string> = {
    search: "search_team",
    analyze: "stub_auditor",
    compare: "stub_comparator",
    chat: "stub_companion",
    clarify: "stub_clarifier",
  };

  return routes[intent || "clarify"];
}

/**
 * Create and compile the coordinator workflow
 *
 * @returns Compiled StateGraph ready for invocation
 */
export function createCoordinatorWorkflow() {
  // Initialize the state graph
  const workflow = new StateGraph(AgentState);

  // Add coordinator node (entry point)
  workflow.addNode("coordinator", coordinatorNode);

  // Add agent nodes
  workflow.addNode("search_team", searchTeamNode);
  workflow.addNode("stub_auditor", stubAuditorNode);
  workflow.addNode("stub_comparator", stubComparatorNode);
  workflow.addNode("stub_companion", stubCompanionNode);
  workflow.addNode("stub_clarifier", stubClarifierNode);

  // Add synthesizer node (final node)
  workflow.addNode("synthesizer", synthesizerNode);

  // Define edges
  // START → coordinator
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addEdge(START, "coordinator");

  // coordinator → [conditional routing based on intent]
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addConditionalEdges("coordinator", routeByIntent, {
    search_team: "search_team",
    stub_auditor: "stub_auditor",
    stub_comparator: "stub_comparator",
    stub_companion: "stub_companion",
    stub_clarifier: "stub_clarifier",
  });

  // All agent nodes → synthesizer
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addEdge("search_team", "synthesizer");
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addEdge("stub_auditor", "synthesizer");
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addEdge("stub_comparator", "synthesizer");
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addEdge("stub_companion", "synthesizer");
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addEdge("stub_clarifier", "synthesizer");

  // synthesizer → END
  // @ts-expect-error - LangGraph type definitions don't properly support custom node names
  workflow.addEdge("synthesizer", END);

  // Compile the workflow
  const app = workflow.compile();

  return app;
}
