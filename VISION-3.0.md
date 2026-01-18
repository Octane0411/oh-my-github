# 🌌 Oh-My-GitHub Vision 3.0

> **North Star (北极星愿景)**: **The Open Source Decision Engine**
> 开源世界的 **Perplexity** —— 别只是搜 (Search)，要去懂 (Know)。

我们不是要教你怎么写代码（那是 Cursor 的事），我们是要帮你**做技术决策**。
我们致力于将开发者从 "Search -> Read -> Filter -> Compare" 的低效循环中解放出来，直接交付**结构化的情报**。

---

## 1. The Problem (痛点)

开发者在寻找开源资源时，面临两难困境：

*   **GitHub Search**:
    *   **痛点**: 只是一个“关键词匹配器”。搜 "RAG"，给你 1000 个结果，你得一个个点进去看 README、看 Commit 时间、看 Issue。
    *   **缺失**: 没有语义理解，没有质量筛选，没有横向对比。
*   **General AI (ChatGPT/Claude)**:
    *   **痛点**: **幻觉**与**滞后**。它不知道昨天某个库发了 Breaking Change，也不知道某个库的 Maintainer 已经跑路了。
    *   **缺失**: 缺乏实时数据支撑，无法给出可信的“体检报告”。

## 2. The Solution (定位)

**Oh-My-GitHub** 是一个**垂直领域的智能搜索引擎**。
它结合了 GitHub 的**实时数据**与 LLM 的**分析能力**，为开发者提供决策支持。

### 核心价值公式
$$Value = (Search + Read + Filter + Compare) - Prompting$$
我们将原本需要 1 小时的调研工作，压缩到 10 秒钟的搜索体验中。

---

## 3. Core Scenarios (核心场景)

我们服务于三种典型的开发者意图：

### 🕵️ The Hunter (猎人) - 模糊搜索
> "我想找个能帮我 review 代码的工具，但我不知道它叫什么。"

*   **User**: "Code review tool for PRs"
*   **OMG**: 识别语义，推荐 `pr-agent`, `claudecode`, `cursor-tools`。
*   **Value**: **Discovery (发现)**。找到那些你不知道名字但符合你需求的库。

### ⚖️ The Researcher (研究员) - 选型对比
> "Zustand 和 Jotai 哪个更适合我的 Next.js 项目？"

*   **User**: "Zustand vs Jotai"
*   **OMG**: 直接生成**对比矩阵**（Bundle Size, Star 趋势, Issue 响应速度, 适用场景）。
*   **Value**: **Decision (决策)**。基于数据的理性选型，避免踩坑。

### 🔭 The Watcher (观察者) - 前沿追踪
> "这周 AI Agent 领域有什么新东西？"

*   **User**: "Latest trending AI agents this week"
*   **OMG**: 过滤掉刷榜项目，提炼出真正有技术突破的新项目，并生成摘要。
*   **Value**: **Insight (洞察)**。高信噪比的技术情报。

---

## 4. UX Paradigm (交互范式)

**"Chat First, Cards for Content"**

我们摒弃复杂的 B 端仪表盘，采用类似 Perplexity 的流式交互，但针对代码内容进行深度优化。

*   **Input**: 自然语言对话框。
*   **Output Stream**:
    *   **Direct Answer**: 一句话总结（"推荐使用 X，因为..."）。
    *   **Structured Cards**: 高密度信息卡片（RepoCard, ComparisonTable）。
    *   **Visualizations**: 趋势图、雷达图（直接嵌入流中）。
*   **Deep Dive**: 点击卡片，侧边展开详细研报（不打断当前对话流）。

---

## 5. Roadmap Strategy (战略路线)

### Phase 1: Smart Search (智能搜索) - *Current Focus*
*   **目标**: 做一个 "Better GitHub Search"。
*   **关键能力**:
    *   **Query Translator**: 把 "好用的 React 动画库" 翻译成精准的 GitHub 搜索参数。
    *   **Scout Agent**: 多策略海选，不漏掉潜力股。
    *   **Screener**: 快速过滤垃圾项目（僵尸、刷榜）。
*   **交付物**: 极速返回的 Top 10 高质量项目列表。

### Phase 2: Deep Insight (深度情报)
*   **目标**: 做开源界的 "Consumer Reports" (消费者报告)。
*   **关键能力**:
    *   **Auditor Agent**: 深度扫描代码库、Issue 和 PR。
    *   **Health Score**: 多维度评分系统（活跃度、健康度、社区友好度）。
    *   **Comparison Engine**: 自动生成竞品对比。

### Phase 3: Ecosystem (生态连接)
*   **目标**: 连接人与代码。
*   **关键能力**:
    *   **Contribution Guide**: 自动寻找 Good First Issue。
    *   **Trend Radar**: 个性化订阅与推送。

---

## 6. What We Are NOT (边界)

*   ❌ **我们不是 IDE**: 不提供代码编辑环境。
*   ❌ **我们不是 Copilot**: 不负责补全代码。
*   ❌ **我们不是 CI/CD**: 不托管构建流程。

**我们是你的技术情报官。**
