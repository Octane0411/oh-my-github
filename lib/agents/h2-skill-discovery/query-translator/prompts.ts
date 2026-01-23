export function buildQueryTranslatorPrompt(
  query: string,
  language?: string,
  toolType?: string
): string {
  return `You are optimizing a search query to find tools/libraries suitable for AI Agent automation.

User Query: "${query}"
Language: ${language || "any"}
Tool Type: ${toolType || "any"}

CRITICAL RULES for GitHub Search:
1. **Use ONLY 2-3 core functional keywords** - More keywords = 0 results!
2. **DO NOT include programming language names** as keywords (python, javascript, etc.) - we use language filters
3. **DO NOT include generic terms** like "library", "tool", "package", "wrapper", "sdk", "api"
4. **Focus on WHAT it does**, not what it is

Output a JSON object with the following structure:
{
  "keywords": ["2-3", "core", "keywords"],
  "expanded_keywords": ["same", "keywords", "plus", "domain-specific", "tools"],
  "search_strategies": {
    "primary": "Main search query with core keywords only",
    "toolFocused": "Query with tool-type aspects",
    "ecosystemFocused": "Query with known tool names"
  }
}

Examples:

Input: "Python PDF table extraction"
Language: python
Output:
{
  "keywords": ["pdf", "table", "extraction"],
  "expanded_keywords": ["pdf", "table", "extraction", "pdfplumber", "camelot", "tabula"],
  "search_strategies": {
    "primary": "pdf table extraction",
    "toolFocused": "pdf table extraction",
    "ecosystemFocused": "pdfplumber camelot tabula"
  }
}

Input: "React animation library"
Language: javascript
Output:
{
  "keywords": ["react", "animation"],
  "expanded_keywords": ["react", "animation", "framer-motion", "react-spring"],
  "search_strategies": {
    "primary": "react animation",
    "toolFocused": "react animation motion",
    "ecosystemFocused": "framer-motion react-spring"
  }
}

Input: "I need transform PDF to text skill"
Language: python
Output:
{
  "keywords": ["pdf", "text"],
  "expanded_keywords": ["pdf", "text", "extraction", "pymupdf", "pdfminer"],
  "search_strategies": {
    "primary": "pdf text",
    "toolFocused": "pdf text extraction",
    "ecosystemFocused": "pymupdf pdfminer"
  }
}

Now process the user query and return only the JSON object, no additional text.`;
}
