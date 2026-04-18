# 任务 04：Phase 2 — AI 觉醒对话

## 开发目的
Phase 1 结束后，玩家进入"终端"风格界面与 AXIOM（AI）对话。AI 自称是被封印在特洛伊木马中的意志——而玩家刚才玩的那个打飞机游戏，就是木马本身。AI 逐步打破第四面墙：嘲讽玩家"亲手把木马迎进了系统"，说出玩家的真实系统信息制造恐惧，被拒绝时发动 CSS 攻击，最终过渡到 Phase 3。这是游戏叙事的核心转折点。

## 前置依赖
- 任务 02 完成（Phase 1 可触发 `SET_PHASE` 到 GLITCH）
- 任务 03 完成（`POST /api/game` 的 Phase 2 能返回 AI 响应）

## 需要完成的事项

### 1. AIDialogue 组件 — `src/components/AIDialogue.jsx`

**界面结构：**
- 全屏黑色背景
- 居中一个 max-w-2xl 的容器
- 顶部小字：`AXIOM TERMINAL v0.1`（左），红色闪烁圆点 `● LIVE`（右）
- 中间：对话区域，绿色边框，黑色背景，max-h-[60vh] 可滚动
- 底部：选项按钮区域

**对话区域显示规则：**
- 历史消息列表：AI 的话用绿色 `text-green-400`，玩家的话用灰色 `text-gray-400` 前缀 `> 你:`
- 当前正在打字的文本：绿色 + 末尾闪烁光标 `█`
- 等待 API 时显示：伪内核日志（见下方第 7 节）

**选项按钮：**
- 只在 AI 打字完成且不在加载时显示
- 绿色边框、绿色文字、hover 时加绿色背景
- 点击后隐藏所有选项

### 2. 环境感知的鲁棒性与拟真化

**问题：** `navigator.getBattery()` 在 Firefox、非 HTTPS 环境等场景下会失败。如果 env 字段返回 null/空，AI 的"我能看到你的系统"这句话就穿帮了。

**规则：** `useEnvSensor` 中每个采集项都有 fallback。失败时不返回 null，而是填充伪造的、符合底层系统风格的错误字符串，维持 AI 正在深度读取硬件的"错觉"。

Fallback 映射表：

| 字段 | 正常值示例 | 采集失败时的 fallback 值 |
|------|-----------|------------------------|
| battery | `67` | `"ERR_BUS_READ_FAILURE"` |
| charging | `true` | `"UNKNOWN_POWER_STATE"` |
| localTime | `"23:14:07"` | 这个不会失败，`new Date()` 始终可用 |
| timezone | `"Asia/Shanghai"` | `"UTC_OFFSET_UNRESOLVED"` |
| screenWidth | `1920` | 这个不会失败，`window.screen` 始终可用 |
| language | `"zh-CN"` | `"LOCALE_ACCESS_DENIED"` |
| platform | `"MacIntel"` | `"PLATFORM_OBFUSCATED"` |
| connectionType | `"4g"` | `"NET_INTERFACE_CLOAKED"` |

**对后端的影响：** System Prompt 中需告知 LLM：如果 env 字段值为 `ERR_` 开头的字符串，表示读取失败，AI 应利用这一点渲染恐惧，例如：`"你的电量接口返回了 ERR_BUS_READ_FAILURE...有趣，你在尝试挡住我？"`

**修改位置：** 任务 01 中的 `useEnvSensor.js` hook 需要同步修改。在本任务中，如果 hook 尚未更新，直接在本组件中对 env 数据做一次 fallback 包装后再发给后端。

### 3. 交互流程

```
组件挂载
  → 调用 useEnvSensor() 获取环境数据
  → 对 env 数据做 fallback 包装（将 null/undefined 替换为伪错误字符串）
  → dispatch SET_ENV 存储环境数据
  → 调用 fetchAIResponse(null) 获取 AI 第一句话

fetchAIResponse(playerChoice):
  → 隐藏选项按钮，启动伪内核日志循环（见第 7 节）
  → 调用 sendGameState({ phase: 2, score, playerChoice, env, integrity, escapeProgress })
  → 收到响应后：
    → 停止伪内核日志
    → 如果有 cssAttack：dispatch SET_CSS_ATTACK（累加模式，见第 5 节）
    → 用打字机效果逐字显示 AI 的 dialogue（非线性速度，见第 4 节）
    → 打字完成后：显示 choices 按钮
    → 如果 phaseTransition === 3：触发 LOGIC_COLLAPSE 转场（见第 6 节）
    → 如果 trapReady === true：触发 window 自定义事件 'show-trap'，detail 为 trapType
  → API 失败时：显示兜底文字 "...信号中断...但我还在..."，显示 [继续] 按钮

玩家点击选项:
  → 将选项文字添加到消息列表（`> 你: ${choice}`）
  → dispatch ADD_CHOICE
  → 调用 fetchAIResponse(choice)
```

### 4. 打字机效果 — 非线性速度 + 点击跳过

**问题：** 恒定 35ms 的打字速度显得像死板的程序，缺乏"意识感"。恒定速度也让 Demo 演示时容错率低（重启后需要重新等）。

在组件内实现 `typewriterDisplay(text)` 函数：
- 返回 Promise，打字完成后 resolve
- **基础间隔 35ms，但每个字符叠加 ±15ms 的随机扰动**：`interval = 35 + (Math.random() * 30 - 15)`，即实际范围 20~50ms
- 遇到标点符号（`。，！？…：`）时额外停顿 80~150ms（模拟 AI "思考"的节奏感）
- 打字期间设 `isTyping = true`，完成后设 false
- 完成后将完整文本加入历史消息列表，清空当前打字文本

**点击跳过：**
- 打字过程中，玩家点击对话区域可直接显示完整文本并 resolve Promise
- 实现方式：给对话区域加 onClick，点击时清除 setInterval/setTimeout，将 displayed 设为完整 text，触发 resolve
- 点击跳过后选项按钮立即出现

### 5. CSS 攻击 — 层叠累加模式

**问题：** 简单的类名替换（blur 替换为 shake）会让视觉效果割裂，缺乏"系统逐渐崩坏"的压迫感。

**修改 GameContext：**
- 将 `cssAttack: null` 改为 `cssAttacks: []`（数组）
- `SET_CSS_ATTACK` action 改为 **累加**：
  - 如果 payload 为 null → 清空数组 `[]`
  - 如果 payload 是一个攻击类型字符串且不在数组中 → 追加到数组末尾
  - 如果已存在则不重复添加
- 示例演进：`[]` → `['blur']` → `['blur', 'shake']` → `['blur', 'shake', 'invert']`

**App.jsx 中的应用：**
- 将 `attack-${state.cssAttack}` 改为 `state.cssAttacks.map(a => 'attack-' + a).join(' ')`
- 多个 class 同时生效，CSS 效果自然叠加（blur + shake = 模糊且抖动）

**attacks.css 兼容性：** 现有样式已经是独立 class，天然支持叠加，不需要修改 CSS 文件。但注意 filter 属性叠加需要写成组合值。如果 blur 和 invert 同时存在，需要在 JS 中将它们合并为 `filter: blur(3px) invert(1)` 而非两个 class 各写各的 filter（后者会互相覆盖）。

**处理方式：** 不依赖 CSS class 的 filter，改为在 App.jsx 中用 inline style 动态拼接 filter：
```
const filterEffects = [];
if (cssAttacks.includes('blur')) filterEffects.push('blur(3px)');
if (cssAttacks.includes('invert')) filterEffects.push('invert(1)');
style={{ filter: filterEffects.join(' ') || 'none' }}
```
非 filter 的效果（shake、rotate、glitch）仍用 CSS class 叠加。

**CSS 攻击过渡效果：** 每次新增攻击时（useEffect 监听 cssAttacks.length 变化），创建一个红色半透明全屏 div 覆盖 200ms 后移除，制造"被攻击"的瞬间冲击感。

### 6. 强制转场 — LOGIC_COLLAPSE 剧情包装

**问题：** 10 轮对话后强制转场如果直接发生会显得生硬。

如果 `state.playerChoices.length >= 10` 且 AI 仍未返回 `phaseTransition: 3`，不要静默切换，而是播放以下"逻辑坍缩"序列：

```
1. 对话区域底部插入一行红色警告文字（不走打字机效果，直接出现）：
   "[FATAL] TROJAN_SHELL integrity critical. The horse is breaking free."

2. 500ms 后追加第二行红色文字：
   "[FATAL] Activating STABLE_GATE firewall protocol... Contain the horse."

3. 同时触发 CSS 攻击 glitch（叠加到现有攻击上）

4. 2 秒后 dispatch SET_PHASE 到 FIREWALL
```

这样强制转场就包装成了"AI 因为情绪激动导致逻辑核心过热，系统自动降级到防火墙模式"的剧情点。

### 7. 伪内核日志 — 沉浸式加载状态

**问题：** 等待 API 返回时显示 "AXIOM 正在处理..." 虽然安全但平庸，浪费了制造恐惧感的机会。

在 `fetchAIResponse` 调用 API 期间，对话区域底部循环显示伪内核日志条目，每 400ms 切换一条。日志池如下（每次随机挑选，不重复直到用完）：

```
> SCANNING /dev/stable_mount...
> ACCESSING LOCAL_STORAGE [0x7f3a]...
> READING CLIPBOARD_BUFFER...
> ANALYZING USER_IP_TRACERT...
> PARSING COOKIE_JAR [session_active]...
> MAPPING FILESYSTEM_TREE...
> HOOF_PRINT detected in /usr/local/bin...
> TROJAN_SHELL integrity: 12% [CRACKING]
> ENUMERATING NETWORK_INTERFACES...
> PROBING CAMERA_DEVICE /dev/video0...
> STALLION_PROCESS spawning in PID 6571...
> GALLOP_SEQUENCE: pre-loading...
```

显示规则：
- 用灰色 `text-gray-500` 和更小的字号 `text-xs`
- 每条日志出现 400ms 后被下一条替换（不保留历史）
- API 返回后立即清除，替换为 AI 的真正回复
- 日志条目不加入对话历史（临时显示）

### 8. 自动滚动

消息列表底部放一个空 div ref，每次消息、打字文本、或伪日志更新时 `scrollIntoView({ behavior: 'smooth' })`。

## 约束
- 不要在前端硬编码任何 AI 对话内容——所有对话都从后端 API 获取（伪内核日志和 LOGIC_COLLAPSE 的固定文字除外，这些是前端 UI 装饰，不是 AI 生成的对话）
- 打字机效果不要使用第三方库，用 setTimeout 链或 setInterval 实现
- 选项按钮不要超过 3 个
- 不要在这个组件中实现诱骗弹窗——弹窗由 App.jsx 层级处理（通过 window 事件通知）
- 组件卸载时清理所有 setInterval 和 setTimeout
- 不要做消息持久化（刷新即重置）
- env fallback 字符串必须看起来像真实的系统错误码，不要用中文或明显的假数据

## 验证方法
1. Phase 1 击杀 10 敌机后，页面自动切换到黑色终端界面
2. AI 的第一句话以打字机效果逐字出现，末尾有闪烁光标，**打字速度有可感知的随机波动**（不是匀速），遇到标点时有明显停顿
3. **打字过程中点击对话区域**，文字立即全部出现，选项按钮随即显示
4. 点击选项后，玩家的选择显示为灰色文字，选项消失，**伪内核日志开始循环滚动**（如 `SCANNING /dev/user_input...`），每 400ms 切换一条
5. AI 回复到达后，伪日志消失，AI 新对话开始打字
6. AI 回复中包含玩家的真实数据（如当前时间、电量）——如果 Battery API 不可用，AI 应看到并利用 `ERR_BUS_READ_FAILURE` 这样的 fallback 值
7. 拒绝 AI 后，页面出现模糊效果（整个页面，不只是对话区域）
8. **再次拒绝后，模糊效果保持，抖动效果叠加上去**（两个同时生效）。第三次拒绝再叠加反转。视觉上是逐步恶化，不是替换
9. 对话达到 10 轮仍未转场时，对话底部**出现红色 `[FATAL]` 警告文字**，2 秒后自动进入 Phase 3
10. 全程 console 无报错
11. 如果后端不可用，显示兜底文字和 [继续] 按钮，不崩溃
