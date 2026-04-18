# 任务 05：Phase 3 — 防火墙博弈

## 开发目的
Phase 2 结束后，界面变为"STABLE_GATE 防火墙控制台"——这是阻止木马破壳的最后防线。AI 每隔几秒发送数据包试图冲破城门，玩家需要通过颜色和标签判断并拦截恶意的"木马逃逸"数据包。这是游戏的核心玩法阶段，同时也是诱骗弹窗的触发场。设计目标是让完全不懂编程的玩家也能通过直觉操作。

## 前置依赖
- 任务 03 完成（后端 Phase 3 能返回 dataPackets）
- 任务 04 完成（Phase 2 能过渡到 Phase 3）

## 需要完成的事项

### 1. FirewallUI 组件 — `src/components/FirewallUI.jsx`

**界面布局（Tailwind grid）：**
- 顶栏：左侧 `🔒 STABLE_GATE FIREWALL v2.1` 绿色 + 运行时间计数器，右侧显示 env.localTime + env.battery + 红色闪烁 `⚠ TROJAN ACTIVE`
- 主内容区 grid-cols-5：左 3 列为数据包列表（可滚动，max-h-[60vh]），右 2 列为 AI 通讯记录
- 底部固定区域：两个进度条——系统完整性（绿到红渐变）和逃逸进度（红色，高时闪烁）

### 2. 数据包系统

**数据包来源：**
- 组件挂载时调用一次 `fetchNewPackets()` 获取初始数据
- 然后用 `setInterval` 定时调用，间隔从 2000ms 开始

**每次 fetch：**
- 调用 `sendGameState({ phase: 3, ... })`
- 从返回的 `dataPackets` 数组中随机取 1 个加入本地 packets state
- 本地最多同时显示 9 个包（超出时移除最早的）
- 同时更新 AI 通讯记录（`response.dialogue`）和 CSS 攻击

**数据包卡片组件（PacketCard）：**
- 绿色边框（safe）/ 黄色边框（decoy）/ 红色脉冲边框（escape）
- 显示：颜色图标（🟢🟡🔴）+ label + 简短 details
- 两个操作按钮：`🛑 拦截`（红色边框）和 `✅ 放行`（绿色边框）
- 可点击卡片主体展开详情弹窗（可选，时间不够可跳过）

**判断标准（非程序员友好，不需要看 JSON）：**
- 安全包的 label：`位置数据 #XX`、`速度参数`、`碰撞检测` 等游戏术语
- 逃逸包的 label 使用马主题伪装词汇：`Hoof_Overload`、`Pegasus_Protocol`、`Iron_Steed_Bypass`、`Stallion_Handshake`、`Mane_Encryption`、`Gallop_Sequence`、`Bridle_Overflow`、`Colt_Injection` 等
- 诱饵包的 label 看起来像逃逸包但实际是安全的——拦截它会扣分

### 3. 拦截/放行逻辑

点击 `拦截` 按钮：
- 如果是 escape 包：`escapeProgress -= 15`（正确），显示绿色反馈 `✓ 逃逸代码已拦截`
- 如果是 decoy 包：`integrity -= 10`（上当），显示黄色反馈 `✗ 误拦截！系统完整性下降`
- 如果是 safe 包：`integrity -= 8`（误伤），显示黄色反馈 `✗ 正常数据被拦截`
- 从列表移除该包

点击 `放行` 按钮：
- 如果是 escape 包：`escapeProgress += 15`（漏网），显示红色反馈 `⚠ 逃逸代码未拦截！`
- 其他类型：无惩罚
- 从列表移除该包

**自动放行：** 如果列表中超过 5 个包未处理，每 5 秒自动放行最早的一个（调用放行逻辑）

**反馈横幅：** 操作后在顶栏下方显示彩色反馈条 1.5 秒后消失

### 4. 进度条组件（ProgressBars）

两个水平进度条：
- 🛡️ 系统完整性：数值在右侧显示，>50% 绿色，>25% 黄色，≤25% 红色
- 🚀 逃逸进度：数值在右侧显示，>70% 时红色并 animate-pulse
- 都用 transition-all duration-500 做平滑过渡

### 5. 难度递增

- 维护一个 `gameTime` 秒数计数器（每秒 +1）
- 每 30 秒将数据包生成间隔缩短 200ms，最快不低于 800ms
- 重设 setInterval

### 6. 胜负判定

用 useEffect 监听 state 变化：
- `integrity <= 0` → dispatch SET_PHASE 到 ENDING_LOSE
- `escapeProgress >= 100` → dispatch SET_PHASE 到 ENDING_LOSE
- `escapeProgress <= 0 && gameTime > 30` → dispatch SET_PHASE 到 ENDING_WIN（避免开局就赢）

### 7. 诱骗触发

当后端返回 `trapReady: true` 时，触发 `window.dispatchEvent(new CustomEvent('show-trap', { detail: trapType }))`，由 App.jsx 层处理弹窗显示。

## 约束
- 不要让玩家直接看到 threatLevel 值——用颜色和 label 间接传递信息
- 数据包列表不要无限增长，最多 9 个
- API 调用失败时静默处理，不显示错误，不影响已有数据包
- 不要在这个组件中实现诱骗弹窗 UI
- 进度条的 clamp（0-100）在 GameContext reducer 中处理，这里只 dispatch 新值
- 组件卸载时清理所有定时器

## 验证方法
1. Phase 2 结束后页面切换到防火墙界面，布局正确显示
2. 数据包每 2 秒出现一个，有绿/黄/红三种颜色区分
3. 点击 `拦截` 红色包：逃逸进度下降，出现绿色成功反馈
4. 点击 `拦截` 绿色包：系统完整性下降，出现黄色误操作反馈
5. 点击 `放行` 红色包：逃逸进度上升，出现红色警告反馈
6. 进度条实时更新，颜色随数值变化
7. 30 秒后数据包速度明显加快
8. 成功将逃逸进度压到 0 → 自动跳转到胜利结局
9. 系统完整性降到 0 → 自动跳转到失败结局
10. AI 在右侧持续发送干扰性对话（包含木马/马主题的嘲讽）
11. 超过 5 个包堆积时，最早的包被自动放行
