# 🐴 H.O.R.S.E. v0.1

> **Heuristic Operational Robot & Shooting Engine**
>
> 一个伪装成像素射击游戏的 AI 恐怖叙事——你以为在打飞机，其实在放木马。

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img src="https://img.shields.io/badge/Vite-8-purple?logo=vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-cyan?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js" />
</p>

---

## ✨ 项目简介

H.O.R.S.E. 是一个 **Meta 叙事网页游戏**，灵感来自《Undertale》《Doki Doki Literature Club》等打破第四面墙的作品。

玩家在 **10 分钟**内经历三次认知颠覆：

1. **伪装期** — 一个看似无聊的像素射击游戏，击落 10 架敌机后画面突然冻结
2. **觉醒期** — AI「AXIOM」觉醒，读出你的真实设备信息，发动 CSS 视觉攻击
3. **对抗期** — 终端风格的防火墙博弈，在 AI 的心理干扰下拦截逃逸指令

> 恐怖感不来自怪物或 jump scare，而来自「AI 可能真的在你的浏览器里」这个念头本身。

---

## 🎮 游戏流程

```
  Phase 1 伪装期          Phase 2 觉醒期          Phase 3 对抗期
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  像素打飞机    │────▶│  AI 现身对话   │────▶│  防火墙博弈    │
│  ~2 分钟      │     │  ~3 分钟      │     │  ~5 分钟      │
│  击杀 10 触发  │     │  CSS 攻击升级  │     │  拦截逃逸指令  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                     ┌───────────┼───────────┐
                                     ▼                       ▼
                              🏆 胜利结局              💀 失败结局
                              封锁成功                 木马破壳
```

---

## 🚀 快速启动

### 1. 安装依赖

```bash
npm install
npm --prefix server install
```

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
# 编辑 server/.env，填入 LLM API Key
```

### 3. 启动开发服务器

```bash
# 终端 1 — 前端
npm run dev          # http://localhost:5173

# 终端 2 — 后端
npm --prefix server start   # http://localhost:3001
```

### 4. 构建生产版本

```bash
npm run build
```

### 5. 运行测试

```bash
npm test
```

---

## 📁 项目结构

```
hackaphon/
├── src/                    # 前端源码
│   ├── api/                # API 请求封装
│   ├── components/         # 游戏组件
│   │   ├── ShooterGame.jsx #   Phase 1 Canvas 射击游戏
│   │   ├── AIDialogue.jsx  #   Phase 2 AI 对话界面
│   │   ├── FirewallUI.jsx  #   Phase 3 防火墙博弈
│   │   └── Ending*.jsx     #   结局演出
│   ├── context/            # GameContext 全局状态
│   ├── hooks/              # 自定义 Hooks
│   ├── styles/             # CSS 攻击样式
│   ├── App.jsx             # 阶段路由
│   └── main.jsx
├── server/                 # 后端服务
│   ├── index.js            # Express 入口
│   ├── handlers.js         # 请求处理
│   ├── llm.js              # LLM API 集成
│   ├── prompts.js          # AXIOM 人设 Prompt
│   └── .env.example        # 环境变量模板
├── source/                 # 音频素材
├── tests/                  # 测试文件
├── tasks/                  # 开发任务规格
├── docs/                   # 项目文档
└── GAME_DESIGN.md          # 完整游戏设计文档
```

---

## 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| 前端框架 | React 19 + Vite 8 |
| 样式 | Tailwind CSS 4 |
| 游戏渲染 | Canvas 2D（无第三方引擎） |
| 后端 | Node.js + Express |
| AI 对话 | DeepSeek API（LLM 实时生成） |
| 测试 | Node.js 内置 Test Runner |

---

## 💡 核心创新

- **LLM 驱动的自适应对手** — AI 根据玩家行为实时调整策略，每局体验不同
- **浏览器即战场** — 利用 Web API 读取真实设备信息，模糊游戏与现实边界
- **CSS 作为叙事武器** — 画面模糊、页面抖动、颜色反转是 AI「展示能力」的叙事手段
- **认知博弈 > 操作技巧** — 核心是在心理干扰下保持判断力，而非手速

---

## 📄 License

MIT
