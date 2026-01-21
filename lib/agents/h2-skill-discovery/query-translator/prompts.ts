export function buildQueryTranslatorPrompt(
  query: string,
  language?: string,
  toolType?: string
): string {
  return `You are optimizing a search query to find tools/libraries suitable for AI Agent automation.

User Query: "${query}"
Language: ${language || "any"}
Tool Type: ${toolType || "any"}

Your task is to enhance the query with:
1. **Package ecosystem terms** (pypi, npm, gem, cargo, crates.io, maven)
2. **Tool-type indicators** (cli, library, sdk, wrapper, api, command-line)
3. **Domain-specific tool names** (if you know popular tools in this space)

Output a JSON object with the following structure:
{
  "keywords": ["array", "of", "core", "keywords"],
  "expanded_keywords": ["keywords", "plus", "ecosystem", "and", "tool", "terms"],
  "search_strategies": {
    "primary": "Main search query focused on the core need",
    "toolFocused": "Query emphasizing CLI/library aspects",
    "ecosystemFocused": "Query targeting specific package ecosystems"
  }
}

Examples:

Input: "Python PDF table extraction"
Output:
{
  "keywords": ["pdf", "table", "extraction", "python"],
  "expanded_keywords": ["pdf", "table", "extraction", "python", "pypi", "library", "cli"],
  "search_strategies": {
    "primary": "pdf table extraction python",
    "toolFocused": "pdf table python library cli tabular data",
    "ecosystemFocused": "pypdf pdfplumber tabula-py camelot python"
  }
}

Input: "React animation library"
Output:
{
  "keywords": ["react", "animation", "library"],
  "expanded_keywords": ["react", "animation", "library", "npm", "javascript", "typescript"],
  "search_strategies": {
    "primary": "react animation library",
    "toolFocused": "react animation npm library component motion",
    "ecosystemFocused": "framer-motion react-spring react-transition npm"
  }
}

Now process the user query and return only the JSON object, no additional text.`;
}
