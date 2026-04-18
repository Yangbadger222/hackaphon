# 任务 04：Phase 2 — AI 觉醒对话

## 开发目的
Phase 1 结束后，玩家进入"终端"风格界面与 AXIOM（AI）对话。AI 逐步打破第四面墙：先自我介绍，然后说出玩家的真实系统信息制造恐惧，被拒绝时发动 CSS 攻击操控网页，最终过渡到 Phase 3。这是游戏叙事的核心转折点。

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
- 等待 API 时显示：灰色闪烁文字 `AXIOM 正在处理...`

**选项按钮：**
- 只在 AI 打字完成且不在加载时显示
- 绿色边框、绿色文字、hover 时加绿色背景
- 点击后隐藏所有选项

### 2. 交互流程

```
组件挂载
  → 调用 useEnvSensor() 获取环境数据
  → dispatch SET_ENV 存储环境数据
  → 调用 fetchAIResponse(null) 获取 AI 第一句话

fetchAIResponse(playerChoice):
  → 隐藏选项按钮，显示加载状态
  → 调用 sendGameState({ phase: 2, score, playerChoice, env, integrity, escapeProgress })
  → 收到响应后：
    → 如果有 cssAttack：dispatch SET_CSS_ATTACK（App.jsx 会自动应用 class）
    → 用打字机效果逐字显示 AI 的 dialogue（每字 35ms）
    → 打字完成后：显示 choices 按钮
    → 如果 phaseTransition === 3：2 秒后 dispatch SET_PHASE 到 FIREWALL
    → 如果 trapReady === true：触发 window 自定义事件 'show-trap'，detail 为 trapType
  → API 失败时：显示兜底文字 "...信号中断...但我还在..."，显示 [继续] 按钮

玩家点击选项:
  → 将选项文字添加到消息列表（`> 你: ${choice}`）
  → dispatch ADD_CHOICE
  → 调用 fetchAIResponse(choice)
```

### 3. 打字机效果

在组件内实现 `typewriterDisplay(text)` 函数：
- 返回 Promise，打字完成后 resolve
- 用 setInterval 每 35ms 截取一个字符更新 state
- 打字期间设 `isTyping = true`，完成后设 false
- 完成后将完整文本加入历史消息列表，清空当前打字文本

### 4. CSS 攻击过渡效果

当 `state.cssAttack` 变化时（useEffect 监听），创建一个红色半透明全屏 div 覆盖 200ms 后移除，制造"被攻击"的瞬间冲击感。

### 5. 强制转场保护

如果 `state.playerChoices.length >= 10` 且 AI 仍未返回 `phaseTransition: 3`，前端强制在 2 秒后切换到 Phase 3，避免对话无限循环。

### 6. 自动滚动

消息列表底部放一个空 div ref，每次消息或打字文本更新时 `scrollIntoView({ behavior: 'smooth' })`。

## 约束
- 不要在前端硬编码任何 AI 对话内容——所有对话都从后端 API 获取
- 打字机效果不要使用第三方库，用简单的 setInterval 实现
- 选项按钮不要超过 3 个
- 不要在这个组件中实现诱骗弹窗——弹窗由 App.jsx 层级处理（通过 window 事件通知）
- 组件卸载时清理所有 setInterval 和 setTimeout
- 不要做消息持久化（刷新即重置）

## 验证方法
1. Phase 1 击杀 10 敌机后，页面自动切换到黑色终端界面
2. AI 的第一句话以打字机效果逐字出现，末尾有闪烁光标
3. 打字完成后出现 2-3 个可点击的选项按钮
4. 点击选项后，玩家的选择显示为灰色文字，选项消失，出现加载状态
5. AI 回复中包含玩家的真实数据（如当前时间、电量）——这取决于后端 LLM 的表现，但前端必须正确传递 env 数据
6. 拒绝 AI 后，页面出现模糊效果（整个页面，不只是对话区域）
7. 再次拒绝后，模糊变为抖动
8. 对话若干轮后，页面内容切换到 Phase 3 的占位文字（或防火墙 UI）
9. 全程 console 无报错
10. 如果后端不可用，显示兜底文字和 [继续] 按钮，不崩溃
