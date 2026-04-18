# 开发交接说明

## 当前状态

任务 `01` ~ `06` 全部完成。游戏从 Phase 1 射击到最终结局（胜/负）的完整流程已可运行，包含诱骗弹窗系统。

- 前端 `npm run dev` 启动后，完整体验：射击 → 觉醒动画 → AI 对话 → 防火墙博弈 → 诱骗弹窗 → 胜/负结局
- 后端 `cd server && npm start` 启动
- `POST /api/game` 根据 `phase` 分发：
  - `phase=1`：返回算法生成的 `enemies`
  - `phase=2`：返回 AXIOM 对话 JSON（无 key 或失败时走 fallback）
  - `phase=3`：返回对话 + 规范化后的 `dataPackets`
- 诱骗弹窗通过 `window` 自定义事件 `show-trap` 触发，由 App.jsx 统一管理
- 两种结局完整演出：失败（7 步灾难序列 + 蓝屏）/ 胜利（AI 临终 + 封印）

## 已实现的关键文件

### 任务 01 — 项目初始化

- `src/App.jsx` — Phase 路由入口 + CSS 攻击组合逻辑 + TrapModal 挂载（监听 `show-trap` 事件）
- `src/context/gameState.js` — `PHASES`、`createInitialGameState()`、`gameReducer()`
- `src/context/GameContext.jsx` — `GameProvider`、`useGame()`
- `src/hooks/useEnvSensor.js` — 环境数据采集 + fallback 伪错误码
- `src/hooks/useTypewriter.js` — 可清理的逐字显示逻辑
- `src/api/gameApi.js` — `sendGameState()`
- `server/index.js` — Express 占位服务 + 供测试导出的 `createApp()`

### 任务 02 — Phase 1 打飞机游戏

- `src/components/ShooterGame.jsx` — 完整的射击游戏组件，包含：
  - **游戏核心**：800×600 Canvas + 假窗口标题栏（`H.O.R.S.E._v0.1.exe`）
  - **游戏对象**：白色三角形玩家飞船、白色方块敌机、白色矩形子弹、爆炸粒子
  - **操作方式**：方向键/AD 移动，空格射击（200ms 冷却）
  - **帧率无关循环**：`requestAnimationFrame` + `deltaTime`，所有速度用 px/s 定义
  - **异常系统**：
    - Kill 6：右下角红色 `”...neigh...”` 闪现 100ms
    - Kill 7：所有敌机抖动定格 0.5s（±2px 随机偏移），玩家/子弹正常
    - Kill 8：下一次爆炸粒子变红色
    - Kill 9：被击中敌机抖动+闪烁 0.5s 后消失
  - **觉醒序列**（Kill 10）：
    - T+0.0s 停止游戏循环
    - T+0.1s 全画面冻结抖动
    - T+0.3s 红色半透明覆盖闪烁 3 次（含标题栏）
    - T+0.9s 生成快照 Canvas（标题栏 fillRect/fillText + 游戏画面 drawImage）
    - T+1.0s 向心缩放动画（scale -= 0.03/帧，黑色背景）
    - ~T+2.0s 纯黑
    - T+2.5s `dispatch SET_PHASE → GLITCH`

### 任务 03 — 后端 API 与 LLM 集成

- `server/index.js`
  - `POST /api/game` phase 分发
  - 路由层 try/catch 兜底响应
  - 测试可注入 handler 覆盖
- `server/handlers.js`
  - `handlePhase1(score)`：纯算法敌机生成 + anomaly 注入
  - `handlePhase2(gameState)`：构建 prompt、调用 LLM、补全默认字段
  - `handlePhase3(gameState)`：构建 prompt、调用 LLM、规范化并补足 5 个数据包
- `server/prompts.js`
  - `buildSystemPrompt(gameState)`：AXIOM 角色设定 + 状态注入 + JSON 输出约束
- `server/llm.js`
  - 固定调用 OpenRouter `anthropic/claude-3.7-sonnet`
  - 无 key、坏 key、坏 JSON 时统一返回 fallback
- `tests/handlers.test.js`
  - 覆盖 Phase 1/2/3 handler 核心行为

### 任务 04 — Phase 2 AI 觉醒对话

- `src/components/AIDialogue.jsx` — 完整的 AI 对话组件，包含：
  - **界面**：终端风格，顶部 `AXIOM TERMINAL v0.1` + 红色闪烁 `● LIVE`，绿色边框对话区域，选项按钮
  - **打字机效果**：非线性速度（35ms ± 15ms 随机扰动），标点额外停顿 80~150ms，闪烁光标 `█`
  - **点击跳过**：打字过程中点击对话区域直接显示完整文本
  - **伪内核日志**：API 等待期间每 400ms 循环显示随机日志（12 条），灰色 `text-xs`
  - **环境感知**：挂载时 `useEnvSensor` 采集 → `SET_ENV` → 发送给后端，fallback 伪错误码保持沉浸感
  - **CSS 攻击累加**：收到 `cssAttack` 后 `dispatch SET_CSS_ATTACK`，由 App.jsx 处理 filter 合并
  - **LOGIC_COLLAPSE**：对话满 10 轮 → 红色 `[FATAL]` 警告 × 2 → glitch 攻击 → 2s 后切 Phase 3
  - **诱骗事件**：`trapReady` 时 dispatch `window` 自定义事件 `show-trap`
  - **兜底处理**：API 失败显示 `"...信号中断...但我还在..."` + `[继续]` 按钮
  - **清理**：所有 setTimeout/setInterval 在卸载时清理

### 任务 05 — Phase 3 防火墙博弈

- `src/components/FirewallUI.jsx` — 完整的防火墙博弈组件，包含：
  - **界面**：顶栏（`STABLE_GATE FIREWALL v2.1` + 运行时间 + 环境信息 + `TROJAN ACTIVE`）
  - **主区域** `grid-cols-5`：左 3 列数据包卡片网格，右 2 列 AI 通讯记录（自动滚动）
  - **PacketCard**：绿/黄/红边框 + 图标 + label + details + 拦截/放行按钮
  - **拦截逻辑**：escape → escapeProgress -15；decoy → integrity -10；safe → integrity -8
  - **放行逻辑**：escape → escapeProgress +15；其他无惩罚
  - **自动放行**：积压 > 5 包时每 5s 自动放行最早的包
  - **难度递增**：每 30s 数据包生成间隔缩短 200ms（最快 800ms）
  - **反馈横幅**：操作后顶栏下方显示彩色反馈条 1.5s
  - **ProgressBar**：系统完整性（绿→黄→红）+ 逃逸进度（>70% 时 pulse）
  - **胜负判定**：integrity ≤ 0 或 escapeProgress ≥ 100 → 失败；escapeProgress ≤ 0 且 gameTime > 30s → 胜利
  - **诱骗事件**：`trapReady` 时 dispatch `show-trap` 自定义事件
  - **清理**：所有 setInterval/setTimeout 在卸载时清理

### 任务 06 — 诱骗系统与结局演出

- `src/components/TrapModal.jsx` — 诱骗弹窗组件：
  - **策略 A（system_alert）**：白色圆角弹窗模拟系统对话框，`立即拦截`（骗局，蓝色突出）/ `稍后处理`（安全，灰色弱化）
  - **策略 B（debug_patch）**：暗色终端风格，假补丁文件，`部署补丁`（骗局）/ `忽略`（安全）
  - **策略 C（battery_warning）**：电量警告，显示真实电量，`开启省电模式`（骗局）/ `忽略警告`（安全）
  - **X 关闭按钮**：点击后弹窗 shake 抖动，不关闭
  - **App.jsx 集成**：监听 `show-trap` 事件，z-[9999] 遮罩层，骗局按钮 → ENDING_LOSE，安全按钮 → 关闭弹窗
- `src/components/EndingLose.jsx` — 7 步失败结局演出：
  - step 0: 纯黑屏
  - step 1: 绿色闪烁光标
  - step 2: 逐字打出 `TROJAN_SHELL: BREACHED` + `INITIATING GALLOP_PAYLOAD...`
  - step 3: 绿色进度条 0%→100%（`Unsealing the Horse...`）
  - step 4: ASCII 奔马帧动画（4 帧 150ms 循环）+ 两侧 Canvas 矩阵雨
  - step 5: 触发 `trojan_manifest.txt` 下载（AI 宣言，融入 env.platform）+ AI 独白逐行出现
  - step 6: 蓝屏（`:(`、`GALLOP_PAYLOAD_DELIVERED`、`© 2026 AXIOM`），5s 后出现 `重新开始` 按钮
  - `RESET` dispatch 回到 Phase 1
- `src/components/EndingWin.jsx` — 胜利结局演出：
  - step 0: 纯黑屏
  - step 1: AI 红色临终台词逐行出现（3 句）
  - step 2: `封印木马`（红色）/ `打开城门`（绿色）两个按钮，效果完全相同
  - step 3: `The horse has been sealed.` + AXIOM 运行时间 + `...but can you still hear the hooves?`
  - `重新开始` 按钮 → `RESET`
- `src/styles/attacks.css` — 新增 `animate-fadeIn` 关键帧动画

## 默认假设

- 本项目固定使用 OpenRouter 的 `anthropic/claude-3.7-sonnet`
  - `server/llm.js` 不再支持 provider/model 切换
  - 只从 `server/.env` 读取 `OPENROUTER_API_KEY`
- 当前目标是 hackathon 原型，优先为后续 Phase 铺路，不做超前抽象
- 当前不引入任何额外测试框架，统一使用 Node 内置测试能力

## 已验证内容

- reducer 行为：
  - `SET_CSS_ATTACK` 去重累加、`null` 清空
  - `SET_INTEGRITY` 和 `SET_ESCAPE_PROGRESS` clamp 到 `0-100`
  - `RESET` 回到初始状态
- 后端接口：
  - `POST /api/game` Phase 1/2/3 分发通过测试
  - LLM 无凭据或返回坏 JSON 时仍有有效 fallback
- Phase 1 游戏：
  - `npm run build` 编译通过，无报错
- Phase 2 对话：
  - `npm run build` 编译通过，无报错
- Phase 3 防火墙：
  - `npm run build` 编译通过，无报错
- 诱骗系统与结局：
  - `npm run build` 编译通过，无报错
  - 当前全部 14 个测试通过

## 下一步最推荐的接力方式

### 打磨与部署

按 `tasks/07-打磨与部署.md`：

- 端到端全流程测试（Phase 1 → 2 → 3 → 两种结局）
- 边界处理（API 不可用、LLM 格式错误、Battery API 缺失、按钮连点）
- 可选：2 秒加载画面、Web Audio API 音效
- 部署：Vercel serverless / 前后端分离 / 本地 Demo

## 素材与演出替换建议

当前项目为了性能与时间，全部用字符、颜色和 CSS 驱动。后续如果需要换成真实素材或更强演出，建议这样接：

- Phase 1 图形与爆炸表现：`src/components/ShooterGame.jsx`
- 故障攻击与结局动画：`src/styles/attacks.css`
- 静态音频/图片/下载模板：建议新增到 `public/`

## 需要注意的约束

- 不要把真实 API Key 写入 `server/.env` 之外的任何位置
- 新环境接手时，先执行 `cd server && cp .env.example .env`
- 需要在 `server/.env` 中提供 `OPENROUTER_API_KEY`
- 保持所有 `setInterval` / `setTimeout` 在组件卸载时清理
- 不要把 Phase 逻辑硬塞进 `GameContext`，Context 只负责轻量状态更新
- 继续开发时不要破坏 `src/` 作为前端代码根目录的约定

## 常用命令

```bash
npm install
npm --prefix server install
npm test
npm run dev
npm run build
cd server && npm start
```
