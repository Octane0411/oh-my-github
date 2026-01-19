# 🌌 Oh-My-GitHub Vision 2026

> **North Star (北极星愿景)**: 做 GitHub 生态的 **"Jarvis"** —— 一个能理解代码、洞察趋势、甚至帮你管理和贡献开源项目的全能智能体。

我们将整个演进过程分为四个**纪元 (Horizons)**，从解决"信息过载"开始，最终实现"全能合伙人"。

---

## 🟢 Horizon 1: The Intelligent Analyst (智能分析师)
> **当前阶段**: "帮我找到并看懂这个项目"
> **核心能力**: Read-Only, Linear Pipeline

这是我们目前 Roadmap (MVP) 正在做的事情。目标是解决 **"信息过载"**，通过多层漏斗模型快速筛选高质量项目。

*   **核心场景**:
    *   "找一个最好的 React 动画库" (Scout)
    *   "这个库还在维护吗？坑多吗？" (Auditor)
    *   "帮我总结它的优缺点" (Reporter)
*   **架构形态**: **Router + Pipeline** (线性工作流)
*   **关键交付**:
    *   ✅ Multi-Agent 漏斗模型 (Scout -> Screener -> Auditor)
    *   ✅ 结构化研报生成

---

## 🔵 Horizon 2: The Knowledge Expert (领域专家)
> **下一阶段**: "教我怎么用这个项目"
> **核心能力**: RAG, Semantic Search, Q&A

这一阶段，Agent 不再只是看"元数据"（Star/Issues），而是深入到**代码和文档内部**。它变成了你的技术导师。

*   **核心场景**:
    *   "claudecode 的 skill 怎么定义？给我个 Demo。" (**Librarian Agent**)
    *   "这个库的 `auth` 模块是怎么实现的？" (Code Walker)
    *   "帮我对比一下 Next.js 和 Remix 的路由实现区别。" (Comparative Analysis)
*   **架构形态**: **Supervisor + RAG Engine** (星型网络)
*   **技术壁垒**:
    *   **GitHub-Native RAG**: 能够实时拉取仓库代码，构建临时向量索引。
    *   **Code Graph**: 理解函数调用关系，而不仅仅是文本匹配。

---

## 🟣 Horizon 3: The Active Contributor (交互执行者)
> **进阶阶段**: "帮我操作这个项目"
> **核心能力**: Write Access, Tool Use, Sandbox

这一阶段，Agent 获得了**手**。它不再只是"读"，它可以"写"和"做"。它开始像 Claude Code 一样在环境中执行任务。

*   **核心场景**:
    *   "把这个库 Clone 下来，跑一下它的 Example。" (Sandbox Runner)
    *   "给这个库提个 Issue，说它的文档链接挂了。" (Issue Bot)
    *   "帮我 Star 所有在这个列表里的库。" (Interaction)
    *   "尝试复现这个 Bug。" (Debugger)
*   **架构形态**: **PAC Loop (Planner-Actor-Critic)**
*   **技术壁垒**:
    *   **Secure Sandbox**: 在云端容器中安全地运行不可信代码。
    *   **OAuth & Permissions**: 深度集成 GitHub App 权限体系。

---

## 🔴 Horizon 4: The Autonomous Partner (全能合伙人)
> **终极形态**: "帮我盯着这个领域"
> **核心能力**: Long-term Memory, Autonomy, Proactive

这一阶段，Agent 拥有了**时间观念**和**自主性**。它变成了你的全职开源助理，像 Manus 一样自主工作。

*   **核心场景**:
    *   "每周五帮我扫一遍 AI 领域的最新趋势，如果有特别火的，直接发日报给我。" (Trend Watcher)
    *   "盯着这个库的 Release，一旦支持了 Vue 3，就通知我并尝试升级我的项目依赖。" (Dependency Guardian)
    *   "帮我维护这个开源项目，自动回复简单的 Issue，合并 Dependabot 的 PR。" (Maintainer Bot)
*   **架构形态**: **Autonomous Swarm** (多智能体集群)
*   **技术壁垒**:
    *   **Long-term Memory**: 记住你半年前关注过什么。
    *   **Cron & Triggers**: 基于事件驱动的自主唤醒机制。

---

## 📐 架构演进图 (The Architectural Evolution)

```mermaid
graph TD
    subgraph H1 [Horizon 1: Analyst]
        User1[User] --> Router
        Router --> Pipeline[Scout -> Auditor]
        Pipeline --> Report[静态研报]
    end

    subgraph H2 [Horizon 2: Expert]
        User2[User] --> Supervisor
        Supervisor <--> RAG[📚 Librarian / RAG]
        Supervisor <--> Code[🧬 Code Graph]
        Supervisor --> Answer[深度问答]
    end

    subgraph H3 [Horizon 3: Contributor]
        User3[User] --> Planner
        Planner <--> Actor[🛠️ Actor]
        Actor <--> Sandbox[📦 Cloud Sandbox]
        Actor <--> GH_API[GitHub Write API]
        Sandbox --> Result[执行结果/PR]
    end

    subgraph H4 [Horizon 4: Partner]
        Trigger[⏰ Time / Event] --> AutoAgent
        AutoAgent[🤖 Autonomous Agent] <--> Memory[🧠 Long-term Memory]
        AutoAgent --> H3
        AutoAgent --> Notification[🔔 主动推送]
    end

    H1 -.-> H2 -.-> H3 -.-> H4