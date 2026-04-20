# DeepSeek API Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将后端 LLM 调用从 `OpenRouter` 切换到 `DeepSeek` 官方 API，同时保持 `callLLM()` 对外接口、fallback 行为和现有 Phase 逻辑不变。

**Architecture:** 保持现有模块边界不变，`server/llm.js` 继续作为唯一的 provider 接入点，`server/handlers.js` 无需感知 provider 变化。先修改测试来锁定新的 URL、模型名和环境变量，再做最小代码迁移，最后同步更新运行文档和环境变量模板。

**Tech Stack:** Node.js, Express, native `fetch`, dotenv, Node built-in test runner

---

## File Structure

- `server/llm.js`：DeepSeek URL、模型常量、认证环境变量和 fallback 逻辑
- `server/.env.example`：DeepSeek 环境变量模板
- `server/package.json`：移除未使用的 `openai` 依赖
- `server/package-lock.json`：与依赖变更保持一致
- `tests/handlers.test.js`：锁定新的 provider 行为与回退逻辑
- `README.md`：同步当前接入方式
- `docs/HANDOFF.md`：同步交接说明中的 provider 与 key 名称

## Chunk 1: Lock The New Contract With Tests

### Task 1: 先把 LLM 迁移行为写成失败测试

**Files:**
- Modify: `tests/handlers.test.js`
- Reference: `docs/superpowers/specs/2026-04-19-deepseek-migration-design.md`

- [ ] **Step 1: 修改导入与断言，指向新的 DeepSeek 常量**

```js
import {
  DEEPSEEK_MODEL,
  callLLM,
  getLLMFallbackResponse,
} from "../server/llm.js";
```

- [ ] **Step 2: 把环境变量测试改成 `DEEPSEEK_API_KEY`**

```js
test("callLLM returns fallback immediately when no DeepSeek credential exists", async () => {
  const result = await callLLM("system", "user", {
    env: { DEEPSEEK_API_KEY: "" },
  });

  assert.deepEqual(result, getLLMFallbackResponse());
});
```

- [ ] **Step 3: 把请求地址和模型断言改成 DeepSeek**

```js
assert.equal(requests[0].url, "https://api.deepseek.com/chat/completions");
assert.equal(JSON.parse(requests[0].options.body).model, DEEPSEEK_MODEL);
```

- [ ] **Step 4: 运行目标测试，确认它先失败**

Run: `npm test -- tests/handlers.test.js`

Expected: FAIL，失败原因应为常量名、URL 或环境变量名仍是旧的 `OpenRouter` 实现，而不是语法错误。

- [ ] **Step 5: 记录本轮测试基线**

Run: `git diff -- tests/handlers.test.js`

Expected: 只出现测试断言和描述文案的 provider 迁移改动。

## Chunk 2: Migrate The Runtime Code

### Task 2: 用最小改动把 `server/llm.js` 切到 DeepSeek

**Files:**
- Modify: `server/llm.js`
- Reference: `tests/handlers.test.js`

- [ ] **Step 1: 改常量名、URL 和默认模型**

```js
export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
export const DEEPSEEK_MODEL = "deepseek-chat";
```

- [ ] **Step 2: 把凭据读取改成 `DEEPSEEK_API_KEY`**

```js
function hasConfiguredCredential(env) {
  const value = env.DEEPSEEK_API_KEY;
  return Boolean(value) && !String(value).includes("your_deepseek_api_key_here");
}
```

- [ ] **Step 3: 更新请求头和请求体中的 provider 细节**

```js
const response = await fetchImpl(DEEPSEEK_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  }),
});
```

- [ ] **Step 4: 运行目标测试，确认迁移代码通过**

Run: `npm test -- tests/handlers.test.js`

Expected: PASS，尤其是 LLM URL / model / fallback 相关测试全部通过。

- [ ] **Step 5: 检查 `server/handlers.js` 无需联动修改**

Run: `rg -n "callLLM|OPENROUTER|DEEPSEEK" server/handlers.js server/llm.js`

Expected: `server/handlers.js` 只继续调用 `callLLM`，provider 细节只留在 `server/llm.js`。

### Task 3: 同步环境变量模板和依赖声明

**Files:**
- Modify: `server/.env.example`
- Modify: `server/package.json`
- Modify: `server/package-lock.json`

- [ ] **Step 1: 把 `.env.example` 改成 DeepSeek key 模板**

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3001
```

- [ ] **Step 2: 移除未使用的 `openai` 依赖**

```json
"dependencies": {
  "cors": "^2.8.6",
  "dotenv": "^17.4.2",
  "express": "^5.2.1"
}
```

- [ ] **Step 3: 更新锁文件**

Run: `npm --prefix server install`

Expected: `server/package-lock.json` 与 `server/package.json` 一致，不再包含 `openai`。

- [ ] **Step 4: 验证运行时配置模板已迁移**

Run: `rg -n "OPENROUTER_API_KEY|DEEPSEEK_API_KEY" server/.env.example server/package.json server/package-lock.json`

Expected: `server/.env.example` 只出现 `DEEPSEEK_API_KEY`；依赖文件中不再出现 `OPENROUTER_API_KEY`；锁文件里不再出现 `openai`。

## Chunk 3: Update Current Docs

### Task 4: 清理当前文档中的旧 provider 描述

**Files:**
- Modify: `README.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: 更新 README 中当前 LLM 接入描述**

```md
- 当前默认接入的 LLM API 为 `DeepSeek`
```

- [ ] **Step 2: 更新 HANDOFF 中的模型、provider 和环境变量说明**

```md
- `server/llm.js`
  - 固定调用 DeepSeek `deepseek-chat`
  - 只从 `server/.env` 读取 `DEEPSEEK_API_KEY`
```

- [ ] **Step 3: 运行关键词检查，确保当前运行文档不再保留旧配置**

Run: `rg -n "OpenRouter|OPENROUTER_API_KEY|anthropic/claude-3.7-sonnet" README.md docs/HANDOFF.md server/.env.example server/llm.js tests/handlers.test.js`

Expected: 无结果。

- [ ] **Step 4: 复查仍保留旧文案的历史任务文档**

Run: `rg -n "OpenRouter|OPENROUTER_API_KEY|anthropic/claude-3.7-sonnet|openai|gpt-4o-mini" docs tasks`

Expected: 可能仍命中历史设计/任务文档；只确认它们属于历史记录，不作为本次 runtime 文档阻塞项。

## Chunk 4: Final Verification

### Task 5: 完整回归并准备本地配置

**Files:**
- Modify: `server/.env` (local only, do not commit)

- [ ] **Step 1: 跑完整测试套件**

Run: `npm test`

Expected: PASS，所有现有测试保持绿色。

- [ ] **Step 2: 把真实 DeepSeek key 写入本地 `server/.env`**

```env
DEEPSEEK_API_KEY=<real-secret>
PORT=3001
```

- [ ] **Step 3: 启动后端验证服务可用**

Run: `npm --prefix server start`

Expected: 服务在 `http://localhost:3001` 正常启动，无缺失环境变量导致的崩溃。

- [ ] **Step 4: 用最小请求验证接口仍返回 JSON**

Run: `curl -s http://localhost:3001/api/game -H 'Content-Type: application/json' -d '{"phase":2,"score":10}'`

Expected: 返回有效 JSON；若模型响应异常，也应返回 fallback 结构而不是 500。

- [ ] **Step 5: 检查工作区只包含本次迁移相关后端改动**

Run: `git status --short`

Expected: 只新增或修改本计划涉及的文件；已有前端改动保持原样，不被回退或覆盖。
