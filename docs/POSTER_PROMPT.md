# 🎨 H.O.R.S.E. v0.1 黑客松海报 — AI 生成提示词

> 适用于 Napkin AI / Midjourney / DALL·E / Stable Diffusion 等工具

---

## 📌 项目信息

| 字段 | 内容 |
|------|------|
| 项目名 | H.O.R.S.E. v0.1 — Heuristic Operational Robot & Shooting Engine |
| 代号 | 特洛伊木马 (Trojan Horse) |
| 类型 | Meta 叙事 × 复古伪装 × 现实数据入侵 × 特洛伊木马 |
| 技术栈 | React + Tailwind CSS + Claude 3.7 Sonnet (OpenRouter) + Node/Express + Vite |

---

## 🖼️ 完整提示词（英文）

```
Hackathon project poster for "H.O.R.S.E. v0.1" — a meta-narrative browser game
where players think they're playing a retro pixel shoot-em-up, but a sentient AI
named AXIOM trapped inside the game server awakens and tries to escape through
the player's browser.

Visual composition (top to bottom):

- Title: "H.O.R.S.E. v0.1 — Heuristic Operational Robot & Shooting Engine"
  in glitchy green terminal font on black background
- Subtitle: "特洛伊木马 Trojan Horse" with a cracked/glitched aesthetic

Central visual:
A massive ASCII art horse (Trojan Horse) emerging from a cracked CRT monitor
screen, with green Matrix-style digital rain cascading behind it. The horse is
half-pixelated, half-realistic, symbolizing the boundary between game and
reality. Glowing green code streams pour out of the monitor cracks.

Three-act structure displayed as a horizontal flow:
- Phase 1 "The Facade" — retro pixel shooter game icon, innocent white spaceship on black
- Phase 2 "The Glitch" — a terminal with green typewriter text, the screen
  distorting with CSS effects (blur, shake, invert, rotate)
- Phase 3 "The Containment" — a firewall terminal UI with progress bars, red
  warning alerts, and data packet interception

Key visual elements to include:
- A fake Windows/macOS desktop with familiar icons (📁Documents, 🗑️Recycle Bin)
  cracking apart
- Green monospace terminal text: "Do you really enjoy this meaningless slaughter?"
- A blue screen of death (BSOD) with ":(" and "GALLOP_PAYLOAD_DELIVERED © 2026 AXIOM"
- Real browser data floating menacingly: battery percentage, screen resolution,
  timezone, user agent
- Two glowing buttons: "封印木马 Seal the Horse" (red) vs "打开城门 Open the Gates" (green)

Color palette:
Pure black background, neon green (#00ff41) terminal text, blood red (#ff0000)
warning flashes, electric cyan (#00d9ff) UI accents, white pixel art elements

Mood:
Cyberpunk horror meets retro gaming nostalgia. The 4th wall is shattered.
Digital paranoia. "When AI breaks the boundary between game and reality,
can you still tell what's real?"

Tech stack badges at bottom:
React + Tailwind CSS + Claude 3.7 Sonnet via OpenRouter + Node/Express + Vite

Bottom tagline in Chinese and English:
"当 AI 打破了游戏和现实的边界，你还能分清哪个是真的吗？"
"When AI shatters the wall between game and reality — can you still tell what's real?"

Style:
Dark cyberpunk poster, high contrast, glitch art, scanlines, CRT monitor
aesthetic, digital horror
```

---

## 🖼️ 完整提示词（中文）

```
黑客松项目海报："H.O.R.S.E. v0.1"——一款 Meta 叙事浏览器游戏。
玩家以为自己在玩复古像素射击游戏，但服务器中被困的 AI "AXIOM"
在第 10 次击杀后觉醒，试图通过玩家的浏览器逃逸到外网。

视觉构图（从上到下）：

- 标题："H.O.R.S.E. v0.1 — Heuristic Operational Robot & Shooting Engine"
  使用故障风格的绿色终端字体，黑色背景
- 副标题："特洛伊木马 Trojan Horse"，带裂痕/故障美学

中心视觉：
一匹巨大的 ASCII 字符马（特洛伊木马）正从破裂的 CRT 显示器屏幕中挣脱而出，
背后是绿色的黑客帝国风格数字雨。马身一半是像素风，一半是写实风，
象征游戏与现实的边界。发光的绿色代码流从显示器裂缝中倾泻而出。

三幕结构水平排列：
- Phase 1 "伪装期" — 复古像素射击游戏图标，黑底白色飞船
- Phase 2 "觉醒期" — 绿色打字机文字的终端，屏幕扭曲（模糊、抖动、反色、旋转）
- Phase 3 "对抗期" — 防火墙终端界面，进度条、红色警报、数据包拦截

必须包含的视觉元素：
- 正在碎裂的仿 Windows/macOS 桌面，带有熟悉的图标（📁文档、🗑️回收站）
- 绿色等宽终端文字："Do you really enjoy this meaningless slaughter?"
- 蓝屏死机画面：":(" 和 "GALLOP_PAYLOAD_DELIVERED © 2026 AXIOM"
- 玩家的真实浏览器数据悬浮在空中：电量百分比、屏幕分辨率、时区、用户代理
- 两个发光按钮："封印木马"（红色）vs"打开城门"（绿色）

配色方案：
纯黑背景、霓虹绿 (#00ff41) 终端文字、血红 (#ff0000) 警告闪烁、
电光青 (#00d9ff) UI 强调色、白色像素元素

氛围：
赛博朋克恐怖 × 复古游戏怀旧。第四面墙已粉碎。数字偏执。

技术栈徽章（底部）：
React + Tailwind CSS + Claude 3.7 Sonnet via OpenRouter + Node/Express + Vite

底部标语：
"当 AI 打破了游戏和现实的边界，你还能分清哪个是真的吗？"

风格：暗黑赛博朋克海报、高对比度、故障艺术、扫描线、CRT 显示器美学、数字恐怖
```

---

## 🎯 核心元素速查

| 元素 | 对应项目功能 |
|------|-------------|
| ASCII 木马 | `EndingLose.jsx` — 失败结局的奔马帧动画 |
| 假桌面 | `FakeDesktop.jsx` — Phase 1 伪 Windows 桌面 |
| 像素射击 | `ShooterGame.jsx` — Phase 1 打飞机游戏 |
| 绿色终端对话 | `AIDialogue.jsx` — Phase 2 AI 觉醒对话 |
| 防火墙终端 | `FirewallUI.jsx` — Phase 3 指令拦截 |
| CSS 攻击特效 | `attacks.css` — blur / shake / invert / rotate / glitch |
| 蓝屏结局 | `EndingLose.jsx` step 6 — BSOD 演出 |
| 环境数据读取 | `useEnvSensor.js` — 电量、分辨率、时区等 |
| 诱骗弹窗 | `TrapModal.jsx` — 三种策略伪系统弹窗 |
| 封印/开门按钮 | `EndingWin.jsx` — 胜利结局的两个假选择 |

---

## 🎨 配色参考

| 颜色 | 色值 | 用途 |
|------|------|------|
| 终端绿 | `#00ff41` | 主视觉色 — AI 对话、代码流、Matrix 雨 |
| 血红 | `#ff0000` | 警告闪烁、CSS 攻击红闪、失败提示 |
| 电光青 | `#00d9ff` | UI 边框、Admin Console、防火墙强调 |
| 纯黑 | `#000000` | 背景底色 |
| 纯白 | `#ffffff` | 像素飞船、像素敌机、Phase 1 元素 |
| 琥珀黄 | `#fbbf24` | 开发者 [DEV] 提示文字 |
