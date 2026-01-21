# H2 Skill Discovery Tests

测试 H2 Skill Discovery Pipeline 和 Consultant Agent 的功能。

## 运行单元测试

```bash
# 运行所有测试
npm run test

# 只运行 H2 Discovery 测试
npm run test h2-skill-discovery

# 运行特定测试文件
npm run test query-translator.test.ts
npm run test acs-evaluator.test.ts
npm run test workflow.integration.test.ts

# 带 UI 界面运行测试
npm run test:ui

# 生成覆盖率报告
npm run test:coverage
```

## 运行手动测试脚本

### 前提条件

需要设置环境变量：

```bash
# .env.local
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_key  # 或者 DEEPSEEK_API_KEY
```

### 直接测试 Workflow

测试完整的 H2 Discovery pipeline（不需要启动服务器）：

```bash
tsx scripts/test-h2-discovery.ts --direct
```

这会测试 3 个场景：
1. Python PDF 表格提取
2. React 动画库
3. Rust JSON 格式化 CLI 工具

### 测试 API 端点

首先启动开发服务器：

```bash
npm run dev
```

然后在另一个终端测试 API：

```bash
# 测试 H2 Discovery API
tsx scripts/test-h2-discovery.ts --api

# 测试 Consultant API
tsx scripts/test-h2-discovery.ts --consultant
```

## 测试覆盖范围

### 单元测试

1. **query-translator.test.ts**
   - ✓ 成功翻译查询
   - ✓ LLM 错误时的降级处理
   - ✓ 无效 JSON 响应的处理

2. **acs-evaluator.test.ts**
   - ✓ 正确评估仓库
   - ✓ LLM 超时的默认分数
   - ✓ 无效 JSON 的处理
   - ✓ 分数归一化（超出范围）
   - ✓ 推荐等级的正确推导

### 集成测试

3. **workflow.integration.test.ts**
   - ✓ 完整 pipeline 执行
   - ✓ 错误处理和优雅降级

## 预期结果

### 成功的测试输出

```
✓ lib/agents/h2-skill-discovery/__tests__/query-translator.test.ts (3)
✓ lib/agents/h2-skill-discovery/__tests__/acs-evaluator.test.ts (5)
✓ lib/agents/h2-skill-discovery/__tests__/workflow.integration.test.ts (2)

Test Files  3 passed (3)
     Tests  10 passed (10)
```

### 手动测试输出示例

```
=== Testing H2 Discovery Workflow Directly ===

Test: Python PDF table extraction
Language: python, Tool Type: library

✓ Success!
  Stage: complete
  Found: 5 repositories
  Cost: $0.0123
  LLM Calls: 6

  Top 3 Results:
    1. jsvine/pdfplumber
       ACS Score: 88/100 (HIGHLY_RECOMMENDED)
       Strategy: PYTHON_SCRIPT
       Stars: 5234
       Reasoning: Has CLI and simple API; Excellent docs with examples...
```

## 故障排除

### 常见问题

1. **测试失败：Missing environment variables**
   - 确保设置了 `GITHUB_TOKEN` 和 `OPENAI_API_KEY`

2. **API 测试失败：Connection refused**
   - 确保 `npm run dev` 正在运行

3. **集成测试超时**
   - 真实 API 调用可能需要更长时间
   - 检查网络连接和 API 速率限制

4. **Mock 失败**
   - 清除 vitest 缓存：`rm -rf node_modules/.vite`
   - 重新运行测试

## 下一步

完成测试后，可以：
1. 查看测试覆盖率报告
2. 运行手动测试验证真实场景
3. 部署到测试环境进行端到端测试
