# oh-my-github

> **The VC Analyst for Open Source Code**

![Status](https://img.shields.io/badge/Status-WIP-orange)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

🚧 **Project Status: Work In Progress (MVP Phase)** 🚧

**oh-my-github** is an AI-powered system that helps developers discover high-quality open source projects worth contributing to. It acts like a Venture Capital analyst, going beyond simple star counts to analyze project activity, contribution friendliness, and code quality.

## 🎯 Key Goals

- **Find "Alpha"**: Discover early-stage projects (100-5k stars) with strong growth momentum.
- **Analyze Friendliness**: Evaluate PR merge rates, issue response times, and maintainer engagement.
- **Deep Audits**: AI-driven analysis of architecture, test coverage, and onboarding difficulty.
- **Save Time**: Transform "mass browsing" into "precise matching".

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), Bun, Vercel AI SDK, TailwindCSS + Shadcn/ui
- **Backend**: Next.js API Routes (Edge Runtime), LangGraph.js
- **AI**: DeepSeek V3
- **Infrastructure**: Vercel, Upstash Redis

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- GitHub Personal Access Token ([create one here](https://github.com/settings/tokens))
- DeepSeek V3 API Key ([get one here](https://platform.deepseek.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/oh-my-github.git
   cd oh-my-github
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your tokens:
   ```env
   GITHUB_TOKEN=ghp_your_token_here
   DEEPSEEK_V3_API_KEY=sk-your_key_here
   ```

4. **Run the development server**
   ```bash
   bun run dev
   # or
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

### Usage

1. Enter a repository name in the format `owner/name` (e.g., `facebook/react`)
2. Click "Analyze" or try the example button
3. Wait 20-30 seconds for the AI analysis to complete
4. View the detailed analysis report

### Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.