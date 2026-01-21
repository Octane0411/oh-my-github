/**
 * Repository Context Fetcher
 *
 * Fetches README, file tree, and dependency files from GitHub
 */

import { Octokit } from "@octokit/rest";
import { Repository } from "../state";

export interface RepositoryContext {
  readme: string;
  fileTree: string;
  dependencyFile: string | null;
}

/**
 * Fetch README content (truncated to 3000 chars)
 */
async function fetchReadme(
  octokit: Octokit,
  fullName: string
): Promise<string> {
  const parts = fullName.split("/");
  if (parts.length !== 2) return "";

  const owner = parts[0]!;
  const repo = parts[1]!;

  try {
    const { data } = await octokit.rest.repos.getReadme({
      owner,
      repo,
    });

    // Decode base64 content
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    // Truncate to 3000 chars
    return content.slice(0, 3000);
  } catch (error) {
    console.warn(`Failed to fetch README for ${fullName}:`, error);
    return "";
  }
}

/**
 * Fetch file tree (depth 2)
 */
async function fetchFileTree(
  octokit: Octokit,
  fullName: string,
  branch: string | null
): Promise<string> {
  if (!branch) {
    return "";
  }

  const parts = fullName.split("/");
  if (parts.length !== 2) return "";

  const owner = parts[0]!;
  const repo = parts[1]!;

  try {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "1", // Get recursive tree
    });

    // Format tree with depth limit of 2
    const lines: string[] = [];
    const seenDirs = new Set<string>();

    for (const item of data.tree.slice(0, 100)) {
      // Limit to 100 items
      if (!item.path) continue;

      const pathParts = item.path.split("/");
      if (pathParts.length > 2) continue; // Depth limit

      // Track directories
      if (pathParts.length === 2) {
        const dir = pathParts[0]!;
        if (!seenDirs.has(dir)) {
          seenDirs.add(dir);
          lines.push(`${dir}/`);
        }
      }

      const indent = "  ".repeat(pathParts.length - 1);
      const name = pathParts[pathParts.length - 1]!;
      const prefix = item.type === "tree" ? "📁" : "📄";
      lines.push(`${indent}${prefix} ${name}`);
    }

    return lines.join("\n");
  } catch (error) {
    console.warn(`Failed to fetch file tree for ${fullName}:`, error);
    return "";
  }
}

/**
 * Fetch dependency file based on language
 */
async function fetchDependencyFile(
  octokit: Octokit,
  fullName: string,
  language: string | null
): Promise<string | null> {
  if (!language) return null;

  const parts = fullName.split("/");
  if (parts.length !== 2) return null;

  const owner = parts[0]!;
  const repo = parts[1]!;

  // Map language to dependency file
  const depFileMap: Record<string, string[]> = {
    python: ["requirements.txt", "setup.py", "pyproject.toml"],
    javascript: ["package.json"],
    typescript: ["package.json"],
    rust: ["Cargo.toml"],
    go: ["go.mod"],
    ruby: ["Gemfile"],
    java: ["pom.xml", "build.gradle"],
  };

  const files = depFileMap[language.toLowerCase()] || [];

  for (const file of files) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file,
      });

      if ("content" in data) {
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return content.slice(0, 2000); // Truncate to 2000 chars
      }
    } catch {
      // File not found, try next one
      continue;
    }
  }

  return null;
}

/**
 * Fetch repository context for ACS evaluation
 */
export async function fetchRepositoryContext(
  octokit: Octokit,
  repo: Repository
): Promise<RepositoryContext> {
  const [readme, fileTree, dependencyFile] = await Promise.all([
    fetchReadme(octokit, repo.full_name),
    fetchFileTree(octokit, repo.full_name, repo.default_branch),
    fetchDependencyFile(octokit, repo.full_name, repo.language),
  ]);

  return {
    readme,
    fileTree,
    dependencyFile,
  };
}
