/**
 * Test GitHub temporal search to discover recent tools
 */

import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function testSearch(query: string, description: string) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Test: ${description}`);
  console.log(`Query: "${query}"`);
  console.log("-".repeat(80));
  
  try {
    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: 10,
    });
    
    console.log(`✅ Found ${data.total_count} repositories (showing top ${data.items.length})`);
    
    if (data.items.length > 0) {
      console.log("\nTop results:");
      data.items.forEach((repo, i) => {
        const created = new Date(repo.created_at).toLocaleDateString();
        const pushed = new Date(repo.pushed_at).toLocaleDateString();
        console.log(`  ${i + 1}. ${repo.full_name} (${repo.stargazers_count} ⭐)`);
        console.log(`     Created: ${created}, Last Push: ${pushed}`);
        console.log(`     ${repo.description?.substring(0, 80) || "No description"}`);
      });
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

async function main() {
  console.log("Testing GitHub Temporal Search Strategy");
  console.log("=========================================\n");
  
  // Test Case: PDF extraction tools
  
  console.log("\n📚 Use Case: PDF Extraction Tools");
  
  // Strategy 1: All-time best
  await testSearch(
    "pdf extraction language:python stars:>1000",
    "All-time Best (经典工具)"
  );
  
  // Strategy 2: Recent tools (2024+)
  await testSearch(
    "pdf extraction language:python created:>2024-01-01 stars:>500",
    "Recent Rising - High Bar (2024+ 新工具，高标准)"
  );
  
  // Strategy 3: Recent tools (lower bar)
  await testSearch(
    "pdf extraction language:python created:>2024-01-01 stars:>100",
    "Recent Rising - Lower Bar (2024+ 新工具，低标准)"
  );
  
  // Strategy 4: Recently active
  await testSearch(
    "pdf extraction language:python pushed:>2024-06-01 stars:>500",
    "Recently Active (2024 下半年活跃项目)"
  );
  
  // Strategy 5: 2023-2024 range
  await testSearch(
    "pdf extraction language:python created:2023-01-01..2024-12-31 stars:>300",
    "2023-2024 Period (近两年新工具)"
  );
  
  console.log("\n\n" + "=".repeat(80));
  console.log("结论分析");
  console.log("=".repeat(80));
  console.log(`
时间过滤策略的价值：
1. All-time Best - 发现经典成熟工具
2. Recent Rising - 发现新兴高质量工具
3. Recently Active - 发现活跃维护的项目

对比 LLM 推荐：
- LLM 擅长: 经典工具（PyMuPDF, pdfminer）
- 时间过滤擅长: 新工具（docling, MinerU, PDF-Extract-Kit）

结论: 两者互补，组合使用最优
  `);
}

main().catch(console.error);
