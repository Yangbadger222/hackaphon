# Task 03 Backend API And LLM Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 `POST /api/game` 的 phase 分发、LLM 调用封装、prompt 构建和 Phase 2/3 兜底行为，使前端可继续接入 Phase 2。

**Architecture:** `server/index.js` 只负责 HTTP 层和兜底响应；`server/handlers.js` 负责 Phase 逻辑；`server/prompts.js` 负责 AXIOM system prompt；`server/llm.js` 负责 OpenAI 调用和 JSON fallback。测试优先覆盖 phase 分发、异常回退和 data packet 补全。

**Tech Stack:** Node.js, Express, OpenAI SDK, dotenv, Node built-in test runner

---

## Chunk 1: Tests First

### Task 1: 写 phase 分发与 handler 测试

**Files:**
- Modify: `tests/server.test.js`
- Create: `tests/handlers.test.js`

- [ ] 为 Phase 1 响应、异常字段和统一返回结构写失败测试
- [ ] 为 Phase 2/3 的默认补全和 fallback 写失败测试
- [ ] 运行 `npm test`，确认失败原因是功能尚未实现

## Chunk 2: Server Modules

### Task 2: 实现 handlers / prompts / llm

**Files:**
- Create: `server/handlers.js`
- Create: `server/prompts.js`
- Create: `server/llm.js`

- [ ] 实现 `handlePhase1`
- [ ] 实现 `handlePhase2`
- [ ] 实现 `handlePhase3`
- [ ] 实现 `buildSystemPrompt`
- [ ] 实现 `callLLM`

### Task 3: 接入 HTTP 层

**Files:**
- Modify: `server/index.js`

- [ ] 在路由中按 `phase` 分发
- [ ] 加入 try/catch 兜底响应
- [ ] 保持 `createApp()` 可用于测试

## Chunk 3: Docs And Verification

### Task 4: 文档补充

**Files:**
- Modify: `server/.env.example`
- Modify: `docs/HANDOFF.md`

- [ ] 增加 LLM 相关环境变量说明
- [ ] 记录 Task 03 完成后的接力点

### Task 5: 完整验证

- [ ] 运行 `npm test`
- [ ] 启动 `node server/index.js`
- [ ] 用 `curl` 验证 Phase 1 / 2 / 3
- [ ] 验证错误 key 或无 key 时仍返回有效 JSON
