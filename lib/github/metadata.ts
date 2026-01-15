/**
 * GitHub repository metadata extraction for deep analysis
 * @module lib/github/metadata
 */

import { getOctokit } from "./client";

/**
 * Time period for activity analysis
 */
interface ActivityWindow {
  twoWeeks: number;
  oneMonth: number;
  threeMonths: number;
}

/**
 * Pull request statistics
 */
interface PRStats {
  total: number;
  merged: number;
  closed: number;
  stale: number;
  mergeRate: number;
  closeRate: number;
  staleRate: number;
}

/**
 * Contributor statistics
 */
interface ContributorStats {
  totalContributors: number;
  externalContributors: number;
  externalRatio: number;
}

/**
 * Documentation file presence
 */
interface Documentation {
  readme: boolean;
  contributing: boolean;
  license: boolean;
  hasCI: boolean;
  hasTests: boolean;
}

/**
 * Repository size and complexity metrics
 */
interface ComplexityMetrics {
  totalFiles: number;
  linesOfCode?: number;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  dependencyCount: number;
  dependencies: string[];
}

/**
 * Comprehensive repository metadata
 */
export interface RepositoryMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;

  // Activity metrics
  commitActivity: ActivityWindow;
  avgIssueResponseTime: number | null; // in hours
  recentCommits: number;

  // Contribution opportunities
  goodFirstIssueCount: number;
  helpWantedCount: number;
  openIssuesCount: number;
  prStats: PRStats;
  contributorStats: ContributorStats;

  // Onboarding quality
  documentation: Documentation;

  // Complexity
  complexity: ComplexityMetrics;

  // Cache timestamp
  fetchedAt: string;
}

/**
 * Fetch commit activity for specified time periods
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<ActivityWindow>} Commit counts by time period
 */
async function fetchCommitActivity(
  owner: string,
  repo: string
): Promise<ActivityWindow> {
  const octokit = getOctokit();
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  try {
    // Fetch commits from the last 3 months (max 100)
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: threeMonthsAgo.toISOString(),
      per_page: 100,
    });

    // Count commits in each period
    const twoWeeks = commits.filter(
      (c) => new Date(c.commit.author?.date || 0) >= twoWeeksAgo
    ).length;

    const oneMonth = commits.filter(
      (c) => new Date(c.commit.author?.date || 0) >= oneMonthAgo
    ).length;

    const threeMonths = commits.length;

    return { twoWeeks, oneMonth, threeMonths };
  } catch (error) {
    console.warn(`⚠️  Failed to fetch commit activity: ${error}`);
    return { twoWeeks: 0, oneMonth: 0, threeMonths: 0 };
  }
}

/**
 * Calculate average issue response time from maintainers
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<number | null>} Average response time in hours, or null if no data
 */
async function calculateIssueResponseTime(
  owner: string,
  repo: string
): Promise<number | null> {
  const octokit = getOctokit();

  try {
    // Fetch last 30 closed issues
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "closed",
      per_page: 30,
      sort: "created",
      direction: "desc",
    });

    if (issues.length === 0) return null;

    const responseTimes: number[] = [];

    for (const issue of issues) {
      // Skip pull requests
      if (issue.pull_request) continue;

      const createdAt = new Date(issue.created_at);

      // Get first comment (maintainer response)
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
        per_page: 1,
      });

      if (comments.length > 0 && comments[0]) {
        const firstResponseAt = new Date(comments[0].created_at);
        const responseTimeMs = firstResponseAt.getTime() - createdAt.getTime();
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60);
        responseTimes.push(responseTimeHours);
      }
    }

    if (responseTimes.length === 0) return null;

    const avgResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    return avgResponseTime;
  } catch (error) {
    console.warn(`⚠️  Failed to calculate issue response time: ${error}`);
    return null;
  }
}

/**
 * Count issues with specific labels
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string[]} labels - Labels to search for
 * @returns {Promise<number>} Count of matching issues
 */
async function countIssuesByLabels(
  owner: string,
  repo: string,
  labels: string[]
): Promise<number> {
  const octokit = getOctokit();

  try {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      labels: labels.join(","),
      per_page: 100,
    });

    // Filter out pull requests
    const actualIssues = issues.filter((issue) => !issue.pull_request);
    return actualIssues.length;
  } catch (error) {
    console.warn(`⚠️  Failed to count issues: ${error}`);
    return 0;
  }
}

/**
 * Analyze pull request statistics
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<PRStats>} PR statistics
 */
async function analyzePRStats(owner: string, repo: string): Promise<PRStats> {
  const octokit = getOctokit();

  try {
    // Fetch last 50 PRs (both merged and closed)
    const { data: prs } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "all",
      per_page: 50,
      sort: "created",
      direction: "desc",
    });

    const total = prs.length;
    const merged = prs.filter((pr) => pr.merged_at !== null).length;
    const closed = prs.filter((pr) => pr.state === "closed" && !pr.merged_at).length;

    // Calculate stale PRs (open for >30 days without activity)
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const stale = prs.filter((pr) => {
      if (pr.state !== "open") return false;
      const updatedAt = new Date(pr.updated_at).getTime();
      return now - updatedAt > thirtyDaysMs;
    }).length;

    const mergeRate = total > 0 ? (merged / total) * 100 : 0;
    const closeRate = total > 0 ? (closed / total) * 100 : 0;
    const staleRate = total > 0 ? (stale / total) * 100 : 0;

    return {
      total,
      merged,
      closed,
      stale,
      mergeRate: Math.round(mergeRate * 10) / 10,
      closeRate: Math.round(closeRate * 10) / 10,
      staleRate: Math.round(staleRate * 10) / 10,
    };
  } catch (error) {
    console.warn(`⚠️  Failed to analyze PR stats: ${error}`);
    return {
      total: 0,
      merged: 0,
      closed: 0,
      stale: 0,
      mergeRate: 0,
      closeRate: 0,
      staleRate: 0,
    };
  }
}

/**
 * Analyze contributor statistics
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<ContributorStats>} Contributor statistics
 */
async function analyzeContributors(
  owner: string,
  repo: string
): Promise<ContributorStats> {
  const octokit = getOctokit();

  try {
    const { data: contributors } = await octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });

    // Get repo collaborators (core team)
    const { data: collaborators } = await octokit.rest.repos.listCollaborators({
      owner,
      repo,
      per_page: 100,
    });

    const collaboratorLogins = new Set(collaborators.map((c) => c.login));
    const externalContributors = contributors.filter(
      (c) => c.login && !collaboratorLogins.has(c.login)
    ).length;

    const totalContributors = contributors.length;
    const externalRatio =
      totalContributors > 0
        ? Math.round((externalContributors / totalContributors) * 100 * 10) / 10
        : 0;

    return {
      totalContributors,
      externalContributors,
      externalRatio,
    };
  } catch (error) {
    console.warn(`⚠️  Failed to analyze contributors: ${error}`);
    return {
      totalContributors: 0,
      externalContributors: 0,
      externalRatio: 0,
    };
  }
}

/**
 * Check for documentation files and quality indicators
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Documentation>} Documentation status
 */
async function checkDocumentation(
  owner: string,
  repo: string
): Promise<Documentation> {
  const octokit = getOctokit();

  const files = {
    readme: false,
    contributing: false,
    license: false,
    hasCI: false,
    hasTests: false,
  };

  try {
    // Check for key files in root
    const checkFiles = [
      "README.md",
      "CONTRIBUTING.md",
      "LICENSE",
      "LICENSE.md",
      ".github/workflows",
      ".travis.yml",
      "tests",
      "test",
      "__tests__",
    ];

    for (const file of checkFiles) {
      try {
        await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file,
        });

        // Mark found
        if (file.toLowerCase().includes("readme")) files.readme = true;
        if (file.toLowerCase().includes("contributing")) files.contributing = true;
        if (file.toLowerCase().includes("license")) files.license = true;
        if (file.includes("workflow") || file.includes("travis")) files.hasCI = true;
        if (file.includes("test")) files.hasTests = true;
      } catch {
        // File doesn't exist, continue
      }
    }

    return files;
  } catch (error) {
    console.warn(`⚠️  Failed to check documentation: ${error}`);
    return files;
  }
}

/**
 * Analyze repository complexity metrics
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<ComplexityMetrics>} Complexity metrics
 */
async function analyzeComplexity(
  owner: string,
  repo: string
): Promise<ComplexityMetrics> {
  const octokit = getOctokit();

  try {
    // Get repository data for languages
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner,
      repo,
    });

    // Try to get dependency files
    const dependencies: string[] = [];
    let dependencyCount = 0;

    const depFiles = [
      "package.json",
      "requirements.txt",
      "Cargo.toml",
      "go.mod",
      "pom.xml",
    ];

    for (const file of depFiles) {
      try {
        const { data: content } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file,
        });

        if ("content" in content) {
          const decoded = Buffer.from(content.content, "base64").toString("utf-8");

          // Parse dependencies based on file type
          if (file === "package.json") {
            const pkg = JSON.parse(decoded);
            const deps = Object.keys(pkg.dependencies || {});
            const devDeps = Object.keys(pkg.devDependencies || {});
            dependencies.push(...deps, ...devDeps);
            dependencyCount = deps.length + devDeps.length;
          } else if (file === "requirements.txt") {
            const lines = decoded.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
            dependencies.push(...lines);
            dependencyCount = lines.length;
          }
          // Add more parsers as needed

          break; // Found a dependency file
        }
      } catch {
        // File doesn't exist, continue
      }
    }

    // Estimate file count from repo size
    const totalFiles = repoData.size; // This is in KB, rough estimate

    return {
      totalFiles,
      primaryLanguage: repoData.language,
      languages,
      dependencyCount,
      dependencies: dependencies.slice(0, 20), // Limit to first 20
    };
  } catch (error) {
    console.warn(`⚠️  Failed to analyze complexity: ${error}`);
    return {
      totalFiles: 0,
      primaryLanguage: null,
      languages: {},
      dependencyCount: 0,
      dependencies: [],
    };
  }
}

/**
 * Extract comprehensive metadata for a repository
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<RepositoryMetadata>} Complete repository metadata
 *
 * @example
 * const metadata = await extractRepositoryMetadata("langchain-ai", "langchain");
 * console.log(`PR merge rate: ${metadata.prStats.mergeRate}%`);
 * console.log(`Has CONTRIBUTING.md: ${metadata.documentation.contributing}`);
 */
export async function extractRepositoryMetadata(
  owner: string,
  repo: string
): Promise<RepositoryMetadata> {
  const octokit = getOctokit();

  console.log(`📊 Extracting metadata for ${owner}/${repo}...`);

  // Get basic repo info
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

  // Fetch all metadata in parallel where possible
  const [
    commitActivity,
    avgIssueResponseTime,
    goodFirstIssueCount,
    helpWantedCount,
    prStats,
    contributorStats,
    documentation,
    complexity,
  ] = await Promise.all([
    fetchCommitActivity(owner, repo),
    calculateIssueResponseTime(owner, repo),
    countIssuesByLabels(owner, repo, ["good first issue"]),
    countIssuesByLabels(owner, repo, ["help wanted"]),
    analyzePRStats(owner, repo),
    analyzeContributors(owner, repo),
    checkDocumentation(owner, repo),
    analyzeComplexity(owner, repo),
  ]);

  console.log(`   ✅ Metadata extraction complete`);

  return {
    owner,
    name: repo,
    fullName: `${owner}/${repo}`,
    description: repoData.description,
    url: repoData.html_url,
    commitActivity,
    avgIssueResponseTime,
    recentCommits: commitActivity.twoWeeks,
    goodFirstIssueCount,
    helpWantedCount,
    openIssuesCount: repoData.open_issues_count,
    prStats,
    contributorStats,
    documentation,
    complexity,
    fetchedAt: new Date().toISOString(),
  };
}
