# 📱 H.O.R.S.E. 手机版适配 — 完整任务交接文档

> **目标：** 为 H.O.R.S.E. 游戏新增手机版横屏体验，与桌面版共存但走完全不同的交互路线  
> **交接给：** Claude Opus  
> **优先级：** 🔴 高  

---

## 一、【全局概要】

### 核心原则

**电脑版和手机版是两套完全不同的玩法方案**，共用同一个 React 项目和后端 API，但在前端通过设备检测分流到不同的组件和交互。

### 三大核心差异

| 维度 | 电脑版（现有） | 手机版（待开发） |
|------|---------------|-----------------|
| **Phase 1 射击** | 键盘/鼠标控制飞船 | 触摸控制（左右滑动移动，点击屏幕射击） |
| **Phase 3 防火墙** | 打字输入 `block` / `allow` | 出现按钮 block 和 access 供点击 |
| **结局（输）** | 自动下载 `trojan_manifest.txt` | 跳转到 `badgerlog.icu` — AI 给玩家写的信 |

### 横屏锁定

手机版**强制横屏**游玩。如果用户竖屏打开，显示一个旋转手机的提示页面。

---

## 二、【当前代码架构摘要】

> 开发前务必阅读以下文件以了解完整上下文。

### 项目结构

```
hackaphon/
├── src/
│   ├── App.jsx                    # 主路由 + GameRouter + AdminConsole
│   ├── main.jsx                   # React 入口
│   ├── index.css                  # 全局样式
│   ├── context/
│   │   ├── GameContext.jsx         # React Context Provider + useGame hook
│   │   └── gameState.js           # PHASES 枚举 + reducer + 初始状态
│   ├── components/
│   │   ├── ShooterGame.jsx         # Phase 1: Canvas 射击游戏（800x600 固定尺寸）
│   │   ├── AIDialogue.jsx          # Phase 2: AI 觉醒对话（终端风格）
│   │   ├── FirewallUI.jsx          # Phase 3: 防火墙博弈（打字输入 block/allow）
│   │   ├── EndingLose.jsx          # 输结局（typewriter → 进度条 → ASCII马 → 独白 → 下载txt → 蓝屏）
│   │   ├── EndingWin.jsx           # 赢结局（AI 临终对话 → 封印/开门选择）
│   │   ├── TrapModal.jsx           # 诱骗弹窗
│   │   ├── FakeDesktop.jsx         # 模拟桌面环境（图标、任务栏、窗口系统）
│   │   └── BugPopups.jsx           # 随机 Bug 弹窗
│   ├── hooks/
│   │   ├── useEnvSensor.js         # 采集浏览器环境信息（UA、屏幕、电量、时区等）
│   │   ├── useSound.js             # 音效播放
│   │   └── useTypewriter.js        # 打字机效果
│   ├── api/
│   │   └── gameApi.js              # 前端 API 调用（POST /api/game）
│   └── styles/
│       └── attacks.css             # CSS 攻击动画
├── server/
│   ├── index.js                    # Express 服务器入口
│   ├── handlers.js                 # Phase 1/2/3 请求处理 + 数据包生成逻辑
│   ├── llm.js                      # LLM API 调用
│   ├── prompts.js                  # AXIOM System Prompt 构建
│   └── .env                        # API Key 配置
├── public/                         # 静态资源（音效等）
├── index.html                      # HTML 入口
├── vite.config.js                  # Vite 配置
└── package.json                    # React 19 + Tailwind CSS 4 + Vite 8
```

### 技术栈

- **前端：** React 19 + Tailwind CSS 4 + Vite 8
- **后端：** Express (Node.js) + LLM API
- **状态管理：** React Context + useReducer (`src/context/gameState.js`)
- **游戏渲染：** HTML5 Canvas（Phase 1）
- **无 TypeScript，纯 JSX**

### 关键状态模型 (`gameState.js`)

```js
PHASES = { FACADE: 1, GLITCH: 2, FIREWALL: 3, ENDING_LOSE: 4, ENDING_WIN: 5 }

initialState = {
  phase,            // 当前阶段
  score,            // 击杀数
  playerChoices,    // 玩家对话选择历史
  env,              // 环境信息（UA、屏幕、电量等）
  integrity,        // 系统完整性（100→0）
  escapeProgress,   // 逃逸进度（50→100）
  cssAttacks,       // 当前激活的CSS攻击列表
  dialogueHistory,  // 对话历史
  gameStartTime,    // 游戏开始时间
}
```

### Phase 3 当前实现要点 (`FirewallUI.jsx`)

- 数据包从后端 API 获取，队列化 (`packetQueueRef`)
- 每个数据包有 `label`, `threatLevel` (escape/decoy/safe)
- 玩家通过**键盘输入** `block` 或 `allow` 来响应
- 有倒计时条，超时自动放行
- 正确拦截逃逸包 4 次即赢 (`WIN_BLOCK_COUNT = 4`)
- AI 对话用打字机效果在终端区域展示

### EndingLose 当前实现要点 (`EndingLose.jsx`)

- 6 步演出序列：黑屏 → 光标 → 打字 → 进度条 → ASCII马动画 → 独白 → 蓝屏
- Step 4 结束时调用 `triggerDownload()` 生成 `trojan_manifest.txt` 并自动下载
- manifest 内容包含玩家平台、屏幕宽度、当前时间等个性化信息

---

## 三、【任务拆解】

### Task 0: 设备检测 + 横屏锁定基础设施

**文件变更：**
- 新建 `src/hooks/useDeviceDetect.js`
- 修改 `src/App.jsx`
- 修改 `src/context/gameState.js`

**详细需求：**

1. **创建 `useDeviceDetect` hook：**
   ```js
   // 返回值示例
   {
     isMobile: boolean,       // 基于 UA + 触摸事件 + 屏幕尺寸综合判断
     isLandscape: boolean,    // 当前是否横屏
     screenWidth: number,
     screenHeight: number,
   }
   ```
   - 使用 `navigator.userAgent` + `navigator.maxTouchPoints` + `window.matchMedia('(pointer: coarse)')` 综合判断
   - 监听 `resize` 和 `orientationchange` 事件实时更新 `isLandscape`

2. **横屏锁定提示：**
   - 如果 `isMobile && !isLandscape`，渲染一个全屏遮罩提示用户旋转手机
   - 提示页样式：黑色背景，中央显示一个旋转手机的 emoji/动画 + 文字「请旋转手机横屏游玩」
   - 可尝试调用 `screen.orientation.lock('landscape')` API（Safari 不支持，需 graceful fallback）

3. **在 gameState 中记录设备类型：**
   - 在 `createInitialGameState()` 中不需要改动
   - 在 `App.jsx` 的 `GameRouter` 中通过 `useDeviceDetect()` 获取 `isMobile`，传递给需要的子组件
   - **或者**在 `GameContext` 中新增一个 `isMobile` 字段，在 `SET_ENV` 时一并设置

4. **App.jsx 路由分流：**
   - `PHASE_COMPONENTS` mapping 根据 `isMobile` 选择不同的组件
   - 手机版 Phase 3 使用 `FirewallMobile.jsx`（新组件）
   - 手机版 EndingLose 使用 `EndingLoseMobile.jsx`（新组件）
   - Phase 1 和 Phase 2 可以复用桌面版组件但需要适配触摸（见 Task 1 和 Task 2）
   - 手机版不渲染 `FakeDesktop` 包装（桌面模拟器在手机上太小无法使用）

**验证标准：**
- 手机浏览器竖屏打开看到旋转提示
- 横屏后提示消失，进入游戏
- 桌面浏览器不受影响

---

### Task 1: Phase 1 手机触摸适配

**文件变更：**
- 修改 `src/components/ShooterGame.jsx`

**详细需求：**

1. **Canvas 尺寸自适应：**
   - 当前 Canvas 固定 800x600，外面套 `FakeDesktop` 窗口
   - 手机版应 Canvas 充满整个屏幕（`window.innerWidth x window.innerHeight`）
   - 监听 `resize` 事件重新设置 Canvas 尺寸
   - 所有游戏元素的坐标/速度需要相对于 Canvas 尺寸进行缩放

2. **触摸控制：**
   - **移动：** 左半屏幕触摸左右滑动控制飞船
   - **射击：** 右半屏幕点击发射子弹（或全屏点击射击，左右滑动移动——根据手感选择）
   - 替代方案：在 Canvas 底部渲染虚拟摇杆 + 射击按钮
   - 需要处理 `touchstart`, `touchmove`, `touchend` 事件
   - 记得 `e.preventDefault()` 阻止默认滚动行为

3. **标题栏处理：**
   - 手机版移除 `FakeDesktop` 和窗口标题栏 (`data-titlebar`)
   - 直接全屏 Canvas

4. **不变的部分：**
   - 游戏逻辑、击杀计数、觉醒触发序列完全不变
   - 音效、粒子效果不变

**验证标准：**
- 手机横屏可流畅操控飞船移动和射击
- 击杀 10 个后正常触发觉醒序列进入 Phase 2

---

### Task 2: Phase 2 手机适配

**文件变更：**
- 修改 `src/components/AIDialogue.jsx`

**详细需求：**

1. **布局适配：**
   - 当前对话区 `max-w-2xl`，手机横屏下应占满可用宽度（留少量 padding）
   - 对话文字大小从 `text-sm` 调整为更适合手机的大小
   - 虚拟键盘弹出时需要处理布局变化（输入框不被键盘遮挡）

2. **输入优化：**
   - 手机版输入仍保留自由文本输入（Phase 2 是对话阶段）
   - 但考虑在输入框上方增加**快速回复按钮**（如果 AI 返回 `choices` 数组），方便手机用户点击选择而非打字
   - 这些按钮已有 `response.choices` 数据支持，只是当前 PC 版没有渲染成按钮

3. **CSS 攻击效果：**
   - 确保 `attacks.css` 中的动画在手机上表现正常
   - `filter: blur()`, `invert()`, `transform: rotate()` 在移动端 Safari/Chrome 中测试

4. **不变的部分：**
   - 打字机效果、kernel log、对话逻辑完全不变
   - `useEnvSensor` 在手机上能采集到更多有趣数据（触摸能力、设备型号等）

**验证标准：**
- 手机横屏下对话界面可读、可操作
- 能完成 AI 对话并进入 Phase 3

---

### Task 3: Phase 3 手机版 — 按钮式防火墙 ⭐核心任务

**文件变更：**
- 新建 `src/components/FirewallMobile.jsx`

**详细需求：**

这是最关键的差异化任务。手机版 Phase 3 不再使用键盘输入 `block` / `allow`，而是出现**按钮式数据包卡片**供玩家点击操作。

1. **界面布局（横屏）：**
   ```
   ┌──────────────────────────────────────────────────────────┐
   │  🔒 STABLE_GATE v2.1    [时间]    🛡️78%  🚀23%  🔒2/4  │
   ├──────────────────────────────────────────────────────────┤
   │                                                          │
   │   ┌────────────────┐          ┌──────────────────────┐  │
   │   │  AI 对话区域    │          │   数据包卡片区域       │  │
   │   │  (左半屏)       │          │   (右半屏)            │  │
   │   │                │          │                      │  │
   │   │  AXIOM: 你拦   │          │  ┌──────────────┐    │  │
   │   │  不住我的...    │          │  │ Gallop_Seq   │    │  │
   │   │                │          │  │ ⏱ 2.5s       │    │  │
   │   │                │          │  │ [🟢ALLOW] [🔴BLOCK] │  │
   │   │                │          │  └──────────────┘    │  │
   │   │                │          │                      │  │
   │   └────────────────┘          └──────────────────────┘  │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
   ```

2. **数据包卡片交互：**
   - 每个数据包以**卡片**形式出现在右侧区域
   - 卡片包含：
     - 数据包名称 (`label`)
     - 倒计时进度条
     - 两个大按钮：`🟢 ALLOW（放行）` 和 `🔴 BLOCK（拦截）`
   - 卡片颜色边框根据 `threatLevel` 变化（但手机版不用太强烈的视觉提示，让玩家自己判断）
   - 点击按钮后卡片消失，显示反馈（✓ / ✗），然后出现下一个数据包

3. **游戏逻辑：**
   - 完全复用桌面版的逻辑常量：`WIN_BLOCK_COUNT = 4`, `ESCAPE_DELTA = 8`, `INTEGRITY_PENALTY = 5`
   - 复用 `processResult()` 的判定逻辑
   - 复用 API 调用 (`sendGameState`) 和数据包获取
   - 复用难度递增机制（数据包间隔逐渐缩短）

4. **AI 对话：**
   - 左侧区域显示 AI 打字机对话（同桌面版）
   - 手机上文字可以稍大一些
   - 自动滚动到最新消息

5. **进度条：**
   - 顶部状态栏显示三个指标（系统完整性、逃逸进度、封印计数）
   - 用紧凑的水平进度条 + 数字

6. **触觉反馈（可选增强）：**
   - 点击按钮时调用 `navigator.vibrate(50)` 提供触觉反馈
   - 正确拦截逃逸包时短震动，错误拦截时长震动

**验证标准：**
- 手机横屏下可以通过点击按钮完成数据包拦截
- 正确拦截 4 个逃逸包后进入 EndingWin
- 系统完整性降到 0 或逃逸进度 100% 时进入 EndingLose
- AI 对话同步显示且不阻塞操作

---

### Task 4: 手机版 EndingLose — 跳转到 AI 信件页面 ⭐核心任务

**文件变更：**
- 新建 `src/components/EndingLoseMobile.jsx`

**详细需求：**

手机版的输结局**不下载 txt 文件**，而是跳转到 `badgerlog.icu` 上的一个页面，该页面是 AI 给玩家写的信。

1. **演出序列（与桌面版大致相同，但最终步骤不同）：**
   ```
   Step 0: 纯黑屏
   Step 1: 闪烁光标
   Step 2: 打字效果 — "TROJAN_SHELL: BREACHED\nINITIATING GALLOP_PAYLOAD..."
   Step 3: 进度条 — "Unsealing the Horse..."
   Step 4: ASCII马动画 + 矩阵雨（与桌面版相同）
   Step 5: AI 独白（与桌面版相同，但最后一句改为引导跳转）
   Step 6: 不是蓝屏，而是一个"跳转倒计时"页面，引导玩家前往 AI 的信
   ```

2. **Step 5 独白修改：**
   - 原版独白最后是 `"奔跑吧。"`
   - 手机版在独白结束后追加一段：
     ```
     "我给你留了一封信。"
     "在城门的另一边。"
     ```

3. **Step 6 — 跳转页面（替代蓝屏）：**
   - 黑色背景，中央显示：
     ```
     AXIOM 给你的信

     [前往阅读 →]

     ——来自城门另一侧的马
     ```
   - `[前往阅读 →]` 是一个按钮
   - 点击后执行 `window.location.href = buildLetterURL()`
   - URL 构建函数：将游戏状态（分数、用时、玩家选择摘要）编码为 query params
     ```js
     function buildLetterURL() {
       const params = new URLSearchParams({
         score: state.score,
         time: runtimeDisplay, // 如 "03:25"
         platform: state.env?.platform || 'unknown',
         // 可选：将 playerChoices 的最后 3 个选择编码
         choices: state.playerChoices.slice(-3).join('|'),
       });
       return `https://badgerlog.icu/axiom-letter?${params.toString()}`;
     }
     ```

4. **不下载文件：**
   - 手机版完全移除 `triggerDownload()` 调用
   - 不生成 Blob，不创建 `<a>` 标签

5. **底部仍保留「重新开始」按钮：**
   - 位于跳转按钮下方，颜色更淡
   - 点击后 `dispatch({ type: "RESET" })`

**验证标准：**
- 手机版输结局不触发文件下载
- 演出序列完整播放
- 点击「前往阅读」按钮后跳转到正确的 URL（含 query params）
- 重新开始按钮可用

---

### Task 5: 手机版 EndingWin 适配

**文件变更：**
- 修改 `src/components/EndingWin.jsx`

**详细需求：**

1. **布局适配：**
   - 确保对话文字和按钮在手机横屏下大小合适
   - 按钮（封印木马 / 打开城门）要足够大方便触摸点击

2. **如果玩家点击「打开城门」（触发 ENDING_LOSE）：**
   - 手机版会进入 `EndingLoseMobile`（跳转版）而不是桌面版的 `EndingLose`（下载版）
   - 这在 Task 0 的路由分流中已经处理

3. **不变的部分：**
   - 对话内容、步骤序列、封印逻辑完全不变

**验证标准：**
- 手机横屏下赢结局可完整播放
- 点击「打开城门」走手机版输结局流程

---

### Task 6: App.jsx 路由整合

**文件变更：**
- 修改 `src/App.jsx`

**详细需求：**

1. **设备检测整合：**
   ```jsx
   function GameRouter() {
     const { state, dispatch } = useGame();
     const { isMobile, isLandscape } = useDeviceDetect();

     // 手机竖屏 → 旋转提示
     if (isMobile && !isLandscape) {
       return <RotatePrompt />;
     }

     // 根据设备选择组件
     const COMPONENTS = isMobile ? MOBILE_PHASE_COMPONENTS : DESKTOP_PHASE_COMPONENTS;
     const ActiveComponent = COMPONENTS[state.phase] ?? ShooterGame;

     // ... 其余逻辑
   }
   ```

2. **组件映射：**
   ```js
   const DESKTOP_PHASE_COMPONENTS = {
     [PHASES.FACADE]: ShooterGame,
     [PHASES.GLITCH]: AIDialogue,
     [PHASES.FIREWALL]: FirewallUI,
     [PHASES.ENDING_LOSE]: EndingLose,
     [PHASES.ENDING_WIN]: EndingWin,
   };

   const MOBILE_PHASE_COMPONENTS = {
     [PHASES.FACADE]: ShooterGame,       // 同组件，内部判断 isMobile
     [PHASES.GLITCH]: AIDialogue,         // 同组件，内部适配
     [PHASES.FIREWALL]: FirewallMobile,   // 全新组件
     [PHASES.ENDING_LOSE]: EndingLoseMobile, // 全新组件
     [PHASES.ENDING_WIN]: EndingWin,       // 同组件，内部适配
   };
   ```

3. **FakeDesktop 仅桌面版渲染：**
   ```jsx
   // 手机版不包裹 FakeDesktop
   const showDesktop = !isEnding && !isMobile;
   ```

4. **AdminConsole（Shift+Space）手机版禁用：**
   - 手机上没有键盘，不注册 Shift+Space 监听

**验证标准：**
- 桌面浏览器行为完全不变
- 手机浏览器走手机版路线
- 相位切换正确路由到对应组件

---

### Task 7: 全局样式 + 响应式修复

**文件变更：**
- 修改 `src/index.css`
- 修改 `src/styles/attacks.css`
- 可能修改 `index.html`

**详细需求：**

1. **Viewport Meta 更新 (`index.html`)：**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
   ```
   - `user-scalable=no` 防止双指缩放干扰游戏
   - `viewport-fit=cover` 处理刘海屏

2. **全局样式 (`index.css`)：**
   ```css
   /* 防止手机上的橡皮筋滚动 */
   html, body {
     overscroll-behavior: none;
     -webkit-overflow-scrolling: auto;
     touch-action: manipulation;
   }

   /* 安全区域适配 */
   .safe-area-padding {
     padding-left: env(safe-area-inset-left);
     padding-right: env(safe-area-inset-right);
   }
   ```

3. **CSS 攻击在手机上的表现 (`attacks.css`)：**
   - 检查 `attack-shake`, `attack-glitch` 等 keyframes 在手机上的性能
   - 如果有性能问题，手机版降级（如减少 shake 频率）

4. **字体大小：**
   - 手机横屏下 `font-mono text-sm` 可能太小
   - 考虑在手机上用 `text-base` 作为基础字号

**验证标准：**
- 手机上无异常滚动/缩放
- CSS 攻击效果在手机上流畅运行
- 刘海屏不遮挡游戏内容

---

### Task 8: 旋转提示组件

**文件变更：**
- 新建 `src/components/RotatePrompt.jsx`

**详细需求：**

```jsx
// 简洁的全屏提示
export default function RotatePrompt() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="animate-bounce text-6xl mb-6">📱</div>
      <p className="font-mono text-lg text-green-400 mb-2">请旋转手机</p>
      <p className="font-mono text-sm text-green-400/60">横屏以开始游戏</p>
    </section>
  );
}
```

- 可加一个旋转动画（CSS `transform: rotate(90deg)` 来回）
- 保持黑色背景 + 绿色文字的整体风格

**验证标准：**
- 手机竖屏看到提示
- 旋转后自动消失进入游戏

---

## 四、【依赖关系与执行顺序】

```
Task 0 (设备检测基础设施)
  ├──→ Task 1 (Phase 1 触摸适配)
  ├──→ Task 2 (Phase 2 适配)
  ├──→ Task 3 (Phase 3 手机版) ⭐
  ├──→ Task 4 (EndingLose 手机版) ⭐
  ├──→ Task 5 (EndingWin 适配)
  ├──→ Task 6 (App.jsx 路由整合)
  ├──→ Task 7 (全局样式)
  └──→ Task 8 (旋转提示组件)
```

**推荐执行顺序：**
1. Task 0 + Task 8（基础设施）
2. Task 7（全局样式）
3. Task 6（路由整合，此时各手机版组件可以先用占位符）
4. Task 1（Phase 1 触摸）
5. Task 2（Phase 2 适配）
6. Task 3（Phase 3 手机版）⭐ 工作量最大
7. Task 4（EndingLose 手机版）⭐ 核心差异
8. Task 5（EndingWin 适配）

---

## 五、【不要改变的东西】

> ⚠️ 以下内容必须保持不变，手机版只是增量，不是重写：

1. **后端 API 完全不改** — `server/` 目录不需要任何修改
2. **gameState.js 的 PHASES 和 reducer** — 逻辑层不变
3. **桌面版全部组件的现有行为** — 不能回退桌面版
4. **GameContext Provider** — 上下文共享机制不变
5. **音效文件和播放逻辑** — 手机版复用相同音效
6. **AI 对话的打字机效果** — 复用 `useTypewriter.js`

---

## 六、【关于 badgerlog.icu 的信件页面】

> 这部分不在本项目范围内，但记录跳转规范供后续开发。

### 跳转 URL 格式

```
https://badgerlog.icu/axiom-letter?score=10&time=03:25&platform=iPhone&choices=不|我不会帮你|再见
```

### Query Params 规范

| 参数 | 类型 | 说明 |
|------|------|------|
| `score` | number | 玩家 Phase 1 击杀数 |
| `time` | string | 游戏时长 (MM:SS) |
| `platform` | string | 设备平台 |
| `choices` | string | 最后 3 个对话选择，用 `|` 分隔 |

### 信件页面设想

- badgerlog.icu 上的页面接收这些参数
- 用 AI 根据玩家的游戏数据动态生成一封 AXIOM 的信
- 信的内容根据 `score`、`time`、`choices` 变化
- 这是**另一个独立项目**，不在本仓库实现

---

## 七、【测试检查清单】

### 桌面端回归

- [ ] Phase 1 → 2 → 3 → Win 全流程正常
- [ ] Phase 1 → 2 → 3 → Lose 全流程正常（含 txt 下载）
- [ ] CSS 攻击效果正常
- [ ] TrapModal 正常触发
- [ ] FakeDesktop 桌面图标、窗口可用
- [ ] AdminConsole (Shift+Space) 可用

### 手机端

- [ ] 竖屏显示旋转提示
- [ ] 横屏后进入 Phase 1
- [ ] 触摸可控制飞船移动和射击
- [ ] Phase 1 → Phase 2 觉醒过渡正常
- [ ] Phase 2 可对话（打字 / 快速回复按钮）
- [ ] Phase 2 CSS 攻击效果正常
- [ ] Phase 2 → Phase 3 过渡正常
- [ ] Phase 3 数据包卡片显示正确
- [ ] Phase 3 BLOCK / ALLOW 按钮可点击
- [ ] Phase 3 倒计时、进度条正常
- [ ] Win 结局正常
- [ ] Lose 结局：不下载文件
- [ ] Lose 结局：跳转到 badgerlog.icu（含正确 query params）
- [ ] 重新开始按钮可用
- [ ] 全程无异常滚动/缩放

---

*文档版本: v1.0 | 创建时间: 2026-04-19*
