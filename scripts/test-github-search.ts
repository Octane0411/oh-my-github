/**
 * Test GitHub Search API behavior
 * 
 * This script tests why our search strategies are returning 0 results
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
      data.items.slice(0, 5).forEach((repo, i) => {
        console.log(`  ${i + 1}. ${repo.full_name} (${repo.stargazers_count} ⭐)`);
        console.log(`     ${repo.description?.substring(0, 80) || "No description"}`);
      });
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

async function main() {
  console.log("Testing GitHub Search API behavior");
  console.log("===================================\n");
  
  // Test 1: Our current query (likely failing)
  await testSearch(
    "pdf text extraction python library stars:>100",
    "Current Primary Search (5 keywords + stars filter)"
  );
  
  // Test 2: Simplified query with fewer keywords
  await testSearch(
    "pdf python stars:>100",
    "Simplified (2 core keywords + stars filter)"
  );
  
  // Test 3: Just core functionality
  await testSearch(
    "pdf extraction python stars:>100",
    "Core functionality (3 keywords + stars filter)"
  );
  
  // Test 4: With language filter instead of keyword
  await testSearch(
    "pdf extraction language:python stars:>100",
    "Using language filter instead of keyword"
  );
  
  // Test 5: OR operator for flexibility
  await testSearch(
    "pdf OR pdfminer OR pypdf language:python stars:>100",
    "Using OR operator for related terms"
  );
  
  // Test 6: Exact phrase matching
  await testSearch(
    '"pdf extraction" language:python stars:>100',
    "Exact phrase matching"
  );
  
  // Test 7: Topic-based search
  await testSearch(
    "pdf topic:pdf language:python stars:>100",
    "Topic-based search"
  );
  
  // Test 8: What our LLM recommended
  await testSearch(
    "pymupdf OR pdfminer language:python",
    "Direct repository name search (what LLM does)"
  );
}

main().catch(console.error);
