#!/bin/bash

# Test script for /api/search endpoint
#
# Prerequisites:
# 1. Next.js dev server must be running: npm run dev
# 2. Environment variables must be set:
#    - GITHUB_TOKEN
#    - DEEPSEEK_API_KEY or OPENAI_API_KEY
#
# Usage: bash scripts/test-api-search.sh

set -e

API_URL="${API_URL:-http://localhost:3000/api/search}"

echo "🧪 Testing /api/search API endpoint"
echo "API URL: $API_URL"
echo "================================"

# Test 1: Valid search query
echo ""
echo "📝 Test 1: Valid search with balanced mode"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScript ORM for PostgreSQL",
    "mode": "balanced"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

# Test 2: Missing query
echo ""
echo "📝 Test 2: Missing query (should fail)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

# Test 3: Invalid mode
echo ""
echo "📝 Test 3: Invalid mode (should fail)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React state management",
    "mode": "invalid"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

# Test 4: Focused mode
echo ""
echo "📝 Test 4: Focused mode"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Rust web framework",
    "mode": "focused"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.data.metadata'

echo ""
echo "✅ All tests completed"
