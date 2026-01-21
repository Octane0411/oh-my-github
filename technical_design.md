# Technical Design: Oh-My-GitHub 3.0

## Architecture Overview: "Supervisor + Sub-Graphs"

为了兼顾对话的灵活性和任务执行的稳定性，我们采用分层架构：
1.  **Outer Layer (Conversation)**: 基于 LLM 的动态路由 (ReAct / Tool Calling)。
2.  **Inner Layer (Execution)**: 基于 LangGraph 的确定性流水线。

```mermaid
graph TD
    User[User Input] --> Consultant[Consultant Agent (The Brain)]
    
    subgraph "The Brain (Flexible LLM)"
        Consultant -- "Needs Clarification" --> Chat[Reply to User]
        Consultant -- "Intent: Search" --> ToolSearch[Tool: Discovery Pipeline]
        Consultant -- "Intent: Build" --> ToolBuild[Tool: Fabrication Pipeline]
    end

    subgraph "Pipeline A: Discovery (LangGraph) - NEW: h2-skill-discovery"
        ToolSearch --> QT[Query Translator]
        QT --> Scout[Scout Agent (Tool-Focused)]
        Scout --> Screener[Screener (ACS Scoring)]
        Screener --> Result[Structured Candidates]
    end

    subgraph "Pipeline B: Fabrication (LangGraph) - NEW: h3-skill-fabrication"
        ToolBuild --> Reader[Repo Reader]
        Reader --> MetaSkill[Meta-Skill Engine]
        MetaSkill --> Packager[Artifact Packager]
        Packager --> Zip[Skill Package]
    end

    Result --> Consultant
    Zip --> Consultant
```

## Directory Structure Strategy
为了保持系统的可演进性，我们采用版本化/场景化的 Pipeline 管理策略：

*   `lib/agents/h1-search-pipeline/`: **Legacy**. 针对 Vision 2.0 (Code Learning) 的搜索。保留以备后用。
*   `lib/agents/h2-skill-discovery/`: **New (Phase 5)**. 针对 Vision 3.0 (Skill Factory) 的搜索。
    *   **Scout**: 优化搜索策略，优先寻找 CLI 工具、Python 库。
    *   **Screener**: 实现 ACS (Agent Compatibility Score) 评分。
*   `lib/agents/h3-skill-fabrication/`: **New (Phase 7)**. 针对 Skill 生成的流水线。

---

## 1. The Consultant Agent (Outer Layer)

*   **Role**: 对话管理、意图识别、工具分发。
*   **Implementation**: Vercel AI SDK `streamText` + `toolCall`.
*   **State**: 维护 `messages` 数组和当前 `phase`。
*   **Tools Definition**:
    ```typescript
    const tools = {
      findRepository: {
        description: "Search GitHub for a tool matching the user's requirements",
        parameters: z.object({ query: z.string(), language: z.string().optional() }),
        execute: async ({ query }) => {
          // Invokes the H2 Discovery Graph
          return await h2DiscoveryGraph.invoke({ query });
        }
      },
      generateSkill: {
        description: "Convert a specific GitHub repository into an Agent Skill",
        parameters: z.object({ repoUrl: z.string() }),
        execute: async ({ repoUrl }) => {
          // Invokes the H3 Fabrication Graph
          return await h3FabricationGraph.invoke({ repoUrl });
        }
      }
    }
    ```

## 2. The Discovery Pipeline (h2-skill-discovery)

*   **Role**: 寻找并评估仓库。
*   **Framework**: LangGraph.
*   **Nodes**:
    1.  **Query Translator**: 扩展搜索关键词 (e.g., add "cli", "tool", "library").
    2.  **Scout**: 并行执行 GitHub Search API。
    3.  **Screener (ACS)**: 执行 `Agent Compatibility Score` 评估 (LLM Evaluation)。
*   **Output**: 包含 ACS 分数的仓库列表。

## 3. The Fabrication Pipeline (h3-skill-fabrication)

*   **Role**: 生成 Skill 制品。
*   **Framework**: LangGraph.
*   **Nodes**:
    1.  **Reader**: 抓取 README, `requirements.txt`, 核心代码。
    2.  **Synthesizer**: 调用 Claude 官方 Meta-Skill 逻辑，生成 `SKILL.md`。
    3.  **Packager**: 生成 Zip 文件。

---

## 4. Data Models

### ACS Score
```typescript
interface ACSScore {
  total: number; // 0-100
  breakdown: {
    interface: number; // 0-30
    docs: number; // 0-30
    env: number; // 0-20
    token: number; // 0-20
  };
  reasoning: string;
}
```
