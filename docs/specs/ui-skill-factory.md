# UI Spec: Skill Factory Interface (Revised)

> **Based on Prototype**: `prototype_skill_factory.html` (with Conversational Enhancements)
> **Vision**: Vision 3.0 (GitHub to Skills Factory)
> **Supersedes**: Proposal 009 (Chat UI Draft)

## 1. Design Philosophy

**"Consultant -> Factory"**
我们不仅仅是一个“搜索引擎”，更是一个“解决方案顾问”。
用户往往带着模糊的需求而来（"我想处理 PDF"）。我们的 UI 必须支持**先咨询，后生产**的流程：
1.  **Consultation**: 通过对话明确需求（Clarify Intent）。
2.  **Discovery**: 寻找最佳原材料（GitHub Repo）。
3.  **Fabrication**: 加工生成成品（Agent Skill）。

UI 将从“单向流”升级为“混合流”：在明确需求前是**对话模式**，明确需求后进入**工厂模式**。

---

## 2. User Flow & Views

应用采用 **Single Page Stream** 布局，但根据阶段不同，展示形式不同。

### 2.1 Initial View (The Landing)
*状态：用户尚未输入任何内容。*

*   **Hero Section**:
    *   大标题: "What skill do you need today?"
    *   副标题: "Describe your task, and I'll build the tool for you."
*   **Central Input**:
    *   巨大的输入框。
    *   Placeholder: "e.g., 'I need to analyze some financial reports'" (鼓励自然语言描述)

### 2.2 Stream View (The Process)

#### Phase 1: Consultation (The Interview)
*状态：需求模糊，Agent 需要追问。*

*   **Interaction**: 标准对话流。
*   **Visual**: 
    *   用户消息：简洁的文本块。
    *   Agent 消息：流式文本，语气专业且引导性强。
*   **Example**:
    *   User: "我想处理 PDF"
    *   Agent: "具体是哪种处理？您是需要**提取表格数据**，还是**合并/拆分文件**？这对选择工具很关键。"
    *   User: "提取表格，最好是 Python 的"
    *   Agent: "明白了。需求锁定：**PDF 表格提取**，偏好 **Python**。正在为您寻找最佳工具..." (自动触发 Phase 2)

#### Phase 2: Discovery (The Scout)
*状态：需求明确，Agent 开始寻找仓库。*

*   **Visual**: 
    *   **Transition**: 对话结束，出现一个 "Scouting Block"。
    *   **Live Logs**: 展示搜索过程（"Searching GitHub for 'pdf table extract python'..."）。
*   **Result (The Screener)**:
    *   **Repo Card**: 展示最佳匹配（如 `pdfplumber`）。
    *   **ACS Score**: 巨大的分数展示，证明为什么选这个库。
    *   **Agent Insight**: "推荐 `pdfplumber` 因为它在表格提取方面比 `pypdf` 更精准，且有清晰的 CLI 支持。"
*   **Action**:
    *   用户可以说："这个不行，换一个" (回到 Phase 1/2)。
    *   或者点击："Convert to Skill" (进入 Phase 3)。

#### Shortcut: Direct Fabrication (The Fast Track)
*状态：用户直接提供了仓库 URL 或明确指定了工具。*

*   **Trigger**: 用户输入 "Convert https://github.com/yt-dlp/yt-dlp to skill" 或 "Make a skill for yt-dlp"。
*   **Flow**: 跳过 Phase 1 & 2，直接进入 Phase 3。
*   **Visual**: 
    *   Agent: "Detected repository: `yt-dlp/yt-dlp`. Starting fabrication..."
    *   立即展示 **FabricatorBlock**。

#### Phase 3: Fabrication (The Factory)
*状态：用户确认转换，开始生成 Skill。*

*   **Visual**:
    *   **Terminal Block**: 黑色背景，展示 Meta-Skill 的执行日志。
    *   体现“正在构建”的工业感。
*   **Output (The Delivery)**:
    *   **Success Card**: 绿色主题。
    *   **Artifacts**: "Download .zip"。
    *   **Instruction Preview**: "这是生成的 Skill 指令预览..."

---

## 3. Component States Update

### New Component: `ConversationBlock`
用于 Phase 1。
*   支持 Markdown 渲染。
*   支持 "Suggestion Chips"（例如 Agent 问完问题后，提供几个快捷选项）。

### Updated Component: `ScoutBlock` (was Searching State)
用于 Phase 2。
*   必须包含 "Reasoning"（为什么搜这个关键词）。

### Updated Component: `FabricatorBlock` (was Generating State)
用于 Phase 3。
*   保持 Terminal 风格，但增加 "Step Progress"（如：Step 1/4: Analyzing README）。

---

## 4. Technical Implementation

### State Management (Zustand)
需要增加一个 `phase` 状态：
```typescript
type Phase = 'IDLE' | 'CONSULTATION' | 'DISCOVERY' | 'FABRICATION' | 'DELIVERY';

interface ChatStore {
  messages: Message[];
  currentPhase: Phase;
  // ...
}
```

### Agent Logic
后端 Agent 需要具备 **Intent Classification** 能力：
*   如果意图模糊 -> 返回 `ClarificationQuestion` (保持在 Phase 1)。
*   如果意图明确 -> 返回 `SearchAction` (进入 Phase 2)。
*   如果包含 URL -> 返回 `FabricateAction` (直接进入 Phase 3)。

---

## 5. Summary of Changes
*   **Added**: Phase 1 (Consultation) - 允许在搜索前进行多轮对话。
*   **Added**: Direct Fabrication Shortcut - 支持直接 URL 转换。
*   **Refined**: 明确了从对话到搜索的**触发点**（Intent Locked）。
*   **Goal**: 确保生成的 Skill 真正符合用户需求，而不是盲目搜索。
