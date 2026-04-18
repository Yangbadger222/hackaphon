# H.O.R.S.E. v0.1 项目初始化设计

**日期：** 2026-04-18
**范围：** 仅覆盖任务 `01-项目初始化`，但会为 `02-07` 预留清晰扩展位。

## 目标

把当前仅含规格文档的仓库，落成一个可启动、可验证、可交接的前后端骨架项目：

- 前端采用 `React + Vite + Tailwind CSS`
- 后端采用 `Node.js + Express`
- 游戏逻辑暂不实现，只搭 Phase 路由、全局状态、hooks、API 层和占位组件
- 文档同时覆盖快速启动、目录职责、后续任务接力点

## 已确认约束

- 所有开发代码放在 `src/`
- 不使用第三方游戏引擎，只允许原生 DOM 和 Canvas 2D
- API 与 AI 响应保持 JSON 结构
- `setInterval` 必须在组件卸载时清理
- 初始化阶段不实现真实游戏玩法或复杂 UI
- 不安装任务文档之外的额外依赖

## 初始化架构

### 前端

- 根目录作为 Vite 应用根目录
- `src/context` 提供 `GameProvider`、`useGame` 与纯 reducer 逻辑
- `src/hooks` 提供环境采集与打字机基础能力
- `src/api` 统一封装 `POST /api/game`
- `src/components` 只创建后续 Phase 的占位组件
- `src/styles/attacks.css` 提前定义 CSS 攻击效果，供 Phase 2/3 直接接入

### 后端

- `server/` 维持独立 Node 包，便于后续单独运行或拆部署
- `server/index.js` 仅暴露初始化占位接口
- `server/.env` 只放占位键，不提交真实密钥
- LLM SDK 默认选 `openai`，原因是任务 03 已明确给出 `gpt-4o-mini` 与 JSON 输出约束

## 文件设计

### 根目录

- `package.json`：前端依赖与启动脚本
- `vite.config.js`：接入 React 与 `@tailwindcss/vite`
- `index.html`：Vite 入口
- `README.md`：快速启动与目录概览

### src

- `src/main.jsx`：挂载 `App`
- `src/App.jsx`：Phase 路由与 CSS 攻击组合
- `src/index.css`：Tailwind 入口和基础页面样式
- `src/context/gameState.js`：纯状态常量、初始状态、reducer、工具函数
- `src/context/GameContext.jsx`：React Context 封装
- `src/hooks/useEnvSensor.js`：一次性读取环境信息并提供伪错误回退值
- `src/hooks/useTypewriter.js`：逐字显示 hook
- `src/api/gameApi.js`：统一请求函数
- `src/components/*.jsx`：五个占位组件
- `src/styles/attacks.css`：攻击样式

### server

- `server/package.json`：后端依赖与模块类型
- `server/index.js`：Express 服务
- `server/.env`：API key 占位

## 关键设计决策

### 1. 纯逻辑与 React 包装分离

`GameContext` 的 reducer 与常量拆到 `src/context/gameState.js`，这样可以直接用 Node 内置测试框架验证：

- Phase 常量是否正确
- `SET_CSS_ATTACK` 是否满足累加/去重/清空规则
- `SET_INTEGRITY` 与 `SET_ESCAPE_PROGRESS` 是否正确 clamp
- `RESET` 是否回到初始状态

### 2. filter 攻击与 class 攻击分离

`blur` 与 `invert` 在 `App.jsx` 中通过 inline `filter` 字符串组合；
`shake`、`rotate`、`glitch` 通过 class 叠加。

这样能直接兼容任务 04 对多重攻击叠加的要求，避免后期返工。

### 3. 环境采集做拟真化回退

`useEnvSensor` 不是简单返回 `null`，而是返回伪系统错误字符串，使 Battery API 等不可用时仍能维持“AI 正在读取设备”的叙事错觉。

### 4. 后端接口先占位但保留扩展路径

初始化阶段只返回 `{ "message": "API ready" }`，但后续任务可直接把：

- 路由分发
- handlers
- llm 调用
- prompts

接入 `server/` 内部，无需重搭结构。

## 验证策略

- 前端：执行构建验证与占位页面检查
- 后端：启动服务后用 `curl` 验证 `/api/game`
- 纯逻辑：用 `node --test` 验证 reducer 和后端占位接口

## 非目标

- 不实现任何游戏循环、AI 对话、真实数据包、诱骗弹窗或结局演出
- 不引入测试库、状态库、路由库或 UI 组件库
- 不做部署配置
