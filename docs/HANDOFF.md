# 开发交接说明

## 当前状态

任务 `01` ~ `06` 全部完成 + 三阶段整体优化已完成。

- Phase 1：假桌面环境（渐变壁纸 + 桌面图标 + 任务栏时钟）+ 血量系统（3 HP、敌机碰撞扣血、无敌闪烁、HP=0 死亡过渡）
- Phase 2：开发者提示（每 3 轮黄色 [DEV] 消息）、终端标题乱码（round 5+）、CSS 攻击红闪、系统警告（round 7+）、自由文本输入
- Phase 3：终端攻防战（AI 发送逃逸指令 + 倒计时，玩家输入 block/allow 拦截，AI 对话穿插干扰，难度递增）
- 环境感知：battery fallback 改为 null，AI 不再重复错误码
- 全流程：桌面射击 → 觉醒/死亡 → AI 对话 → 终端攻防 → 诱骗弹窗 → 胜/负结局
- `npm run build` 通过，14 个测试全部通过

## 已实现的关键文件

### 任务 01 — 项目初始化

- `src/App.jsx` — Phase 路由入口 + CSS 攻击组合逻辑 + TrapModal 挂载（监听 `show-trap` 事件）
- `src/context/gameState.js` — `PHASES`、`createInitialGameState()`、`gameReducer()`
- `src/context/GameContext.jsx` — `GameProvider`、`useGame()`
- `src/hooks/useEnvSensor.js` — 环境数据采集 + fallback 伪错误码
- `src/hooks/useTypewriter.js` — 可清理的逐字显示逻辑
- `src/api/gameApi.js` — `sendGameState()`
- `server/index.js` — Express 占位服务 + 供测试导出的 `createApp()`

### 任务 02 — Phase 1 打飞机游戏 + 假桌面 + 血量

- `src/components/FakeDesktop.jsx`（新增）— 假桌面环境：
  - 深色渐变壁纸 + 📁文档/📁项目/🗑️回收站 桌面图标
  - 底部任务栏：🪟开始 | H.O.R.S.E._v0.1 | 实时时钟 HH:MM
- `src/components/ShooterGame.jsx` — 射击游戏 + 血量系统，包含：
  - **假桌面包裹**：游戏窗口渲染在 FakeDesktop 桌面上
  - **血量系统**：3 HP（♥♥♥），敌机碰撞扣血 + 红色爆炸 + 1s 无敌闪烁
  - **两种 Phase 2 过渡**：
    - Kill 10 → 完整觉醒仪式（抖动 + 红闪 + 向心缩放）
    - HP=0 → 快速黑屏渐变 500ms 直接切换（AI 接管崩溃的游戏）
  - 觉醒缩放时桌面背景可见（窗口从桌面上被吞噬的效果）
  - 原有异常系统（Kill 6-9）不变

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
  - 固定调用 DeepSeek `deepseek-chat`
  - 无 key、坏 key、坏 JSON 时统一返回 fallback
- `tests/handlers.test.js`
  - 覆盖 Phase 1/2/3 handler 核心行为

### 任务 04 — Phase 2 AI 觉醒对话 + 演出增强

- `src/components/AIDialogue.jsx` — AI 对话组件 + 多层演出效果：
  - **自由文本输入**：终端风格 `>` 前缀输入框，Enter 提交
  - **打字机效果**：非线性速度 + 标点停顿 + 点击跳过 + 闪烁光标
  - **开发者提示**：每 3 轮（round 3/6/9）插入黄色 `[DEV]` 消息（"不要释放 AXIOM" 等 5 条）
  - **终端标题退化**：round ≥ 5 后标题每 2-3s 随机乱码 1-3 个字符（500ms 恢复）
  - **CSS 攻击红闪**：收到 cssAttack 时全屏红色 overlay 200ms
  - **系统警告**：round ≥ 7 后每 8-12s 淡入淡出红色警告条（`⚠ CONTAINMENT BREACH DETECTED` 等）
  - **伪内核日志** + **LOGIC_COLLAPSE** + **诱骗事件** + **兜底处理** 不变
- `src/hooks/useEnvSensor.js` — battery/charging fallback 改为 `null`（不再是假错误码）
- `server/prompts.js` — AI 优先使用 screen/timezone/language/platform/time 等始终可用数据；battery 为 null 时暗示"权限被封锁"

### 任务 05 — Phase 3 终端攻防战（重写）

- `src/components/FirewallUI.jsx` — 终端风格指令拦截游戏：
  - **布局**：全终端视图 — 顶部进度条 + 中间可滚动终端 + 底部输入框
  - **核心机制**：AI 发送逃逸指令（如 `AXIOM> sudo mount /dev/escape0`），带倒计时进度条
  - **玩家操作**：输入 `block` 拦截 / `allow` 放行，超时自动放行
  - **判定**：block escape → escapeProgress -15；allow escape → +15；block safe/decoy → integrity -10
  - **AI 对话穿插**：指令间 AI 发送打字机对话，试图说服玩家放行
  - **自由文字**：非 block/allow 输入作为对话发送给 AI
  - **难度递增**：每 30s 指令间隔 -0.5s（最快 2s），响应时间 -0.3s（最短 2s）
  - **开发者提示**：每 3 轮黄色 `[DEV]` 消息
  - **胜负条件不变**：integrity ≤ 0 或 escapeProgress ≥ 100 → 失败；escapeProgress ≤ 0 且 gameTime > 30s → 胜利
  - **后端不改**：复用 handlePhase3 返回的 dataPackets + dialogue

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

- 本项目固定使用 DeepSeek 的 `deepseek-chat`
  - `server/llm.js` 不再支持 provider/model 切换
  - 只从 `server/.env` 读取 `DEEPSEEK_API_KEY`
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
- 需要在 `server/.env` 中提供 `DEEPSEEK_API_KEY`
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
