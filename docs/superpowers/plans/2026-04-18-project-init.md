# H.O.R.S.E. Project Initialization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把仅含规格文档的仓库初始化为可运行的前后端骨架，并补齐后续阶段可直接接力的开发文档。

**Architecture:** 根目录承载 Vite 前端，`server/` 承载独立 Express 服务。状态逻辑拆为可测试的纯模块，React 只做包装；App 先提供 Phase 路由与攻击样式组合逻辑，不实现真实玩法。

**Tech Stack:** React, Vite, Tailwind CSS, Node.js, Express, CORS, dotenv, OpenAI SDK, Node built-in test runner

---

## Chunk 1: Workspace Bootstrap

### Task 1: 创建前端运行骨架

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/index.css`

- [ ] 写出前端依赖与脚本
- [ ] 接入 React 与 `@tailwindcss/vite`
- [ ] 建立 Vite 入口与基础样式
- [ ] 运行安装命令并确认依赖就绪

### Task 2: 创建后端运行骨架

**Files:**
- Create: `server/package.json`
- Create: `server/index.js`
- Create: `server/.env`

- [ ] 写出后端包配置并设置 `"type": "module"`
- [ ] 创建 Express 服务与 `/api/game` 占位接口
- [ ] 添加 `.env` 占位变量说明
- [ ] 安装后端依赖

## Chunk 2: State And App Shell

### Task 3: 先写纯逻辑测试

**Files:**
- Create: `tests/gameState.test.js`
- Create: `tests/server.test.js`

- [ ] 为 reducer 的 clamp、reset、cssAttack 累加规则写失败测试
- [ ] 为后端 `/api/game` 占位接口写失败测试
- [ ] 运行 `node --test` 验证当前失败点符合预期

### Task 4: 实现全局状态与 App 路由

**Files:**
- Create: `src/context/gameState.js`
- Create: `src/context/GameContext.jsx`
- Create: `src/App.jsx`
- Create: `src/components/ShooterGame.jsx`
- Create: `src/components/AIDialogue.jsx`
- Create: `src/components/FirewallUI.jsx`
- Create: `src/components/EndingLose.jsx`
- Create: `src/components/EndingWin.jsx`
- Create: `src/styles/attacks.css`

- [ ] 实现 `PHASES`、`initialGameState`、`gameReducer`
- [ ] 实现 `GameProvider` 和 `useGame`
- [ ] 在 `App.jsx` 中完成 Phase 路由与攻击效果组合
- [ ] 创建五个后续阶段占位组件
- [ ] 添加 CSS 攻击样式
- [ ] 重新运行 `node --test` 确认转绿

## Chunk 3: Hooks, API, Docs, Verification

### Task 5: 实现基础 hooks 与 API 层

**Files:**
- Create: `src/hooks/useEnvSensor.js`
- Create: `src/hooks/useTypewriter.js`
- Create: `src/api/gameApi.js`

- [ ] 实现带 fallback 的环境采集 hook
- [ ] 实现可清理的打字机 hook
- [ ] 实现 `sendGameState`

### Task 6: 补齐开发与交接文档

**Files:**
- Create: `README.md`
- Create: `docs/HANDOFF.md`

- [ ] 写快速启动和目录职责
- [ ] 写当前完成范围、下一步开发顺序、素材替换位说明
- [ ] 标注 LLM SDK 默认选择与改造点

### Task 7: 运行完整验证

**Run:**
- `npm install`
- `npm --prefix server install`
- `node --test`
- `npm run build`
- `node server/index.js`
- `curl -X POST http://localhost:3001/api/game -H "Content-Type: application/json" -d '{"phase":1}'`

- [ ] 执行测试与构建
- [ ] 手动验证后端接口
- [ ] 记录实际结果到交接文档
