# H.O.R.S.E. v0.1

H.O.R.S.E. v0.1（Heuristic Operational Robot & Shooting Engine）是一个网页 Meta 叙事游戏原型。当前仓库已经完成任务 `01-项目初始化`：前后端骨架、全局状态、基础 hooks、API 通信层、Phase 路由占位和开发文档均已就绪。

## 当前完成范围

- React + Vite + Tailwind CSS 前端骨架
- `server/` 下的 Node + Express 占位服务
- `GameContext` / `useReducer` 全局状态管理
- `useEnvSensor` 与 `useTypewriter` 基础 hooks
- `sendGameState()` API 封装
- App 阶段路由与 CSS 攻击样式
- 任务 02-06 所需占位组件
- Node 内置测试覆盖 reducer 规则与 `/api/game` 占位接口

## 快速启动

### 1. 安装依赖

```bash
npm install
npm --prefix server install
```

### 2. 启动前端

```bash
npm run dev
```

默认地址：`http://localhost:5173`

### 3. 启动后端

```bash
cd server
cp .env.example .env
npm start
```

默认地址：`http://localhost:3001`

### 4. 运行测试

```bash
npm test
```

### 5. 构建前端

```bash
npm run build
```

## 关键目录

```text
.
├── src/
│   ├── api/          # 前端请求封装
│   ├── components/   # Phase 占位组件
│   ├── context/      # GameContext 与纯 reducer
│   ├── hooks/        # 环境采集、打字机等基础能力
│   ├── styles/       # CSS 攻击样式
│   ├── App.jsx       # 阶段路由与攻击效果组合
│   └── main.jsx
├── server/
│   ├── index.js      # Express 占位服务
│   ├── .env          # 本地 API key 占位
│   └── .env.example  # 可提交的环境变量模板
├── tests/            # Node 内置测试
├── docs/
│   ├── HANDOFF.md
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── tasks/            # 原始任务规格
```

## 重要实现约定

- 所有开发代码都位于 `src/`
- 不使用第三方游戏引擎，后续游戏阶段只用 DOM + Canvas 2D
- 当前默认接入的 LLM API 为 `DeepSeek`
- `state.cssAttacks` 采用累加模式，`blur`/`invert` 用 inline filter 组合，其他攻击用 class 叠加
- `useEnvSensor` 在 API 不可用时会返回伪系统错误码，而不是 `null`

## 后续开发顺序

1. `tasks/02-Phase1-打飞机游戏.md`
2. `tasks/03-后端API与LLM集成.md`
3. `tasks/04-Phase2-AI觉醒对话.md`
4. `tasks/05-Phase3-防火墙博弈.md`
5. `tasks/06-诱骗系统与结局演出.md`
6. `tasks/07-打磨与部署.md`

## 素材替换位

当前初始化阶段严格遵守“轻量、字符、CSS 优先”，没有引入重型素材。后续若要替换成真实资源，建议使用这些位置：

- `src/components/ShooterGame.jsx`：后续 Canvas 图形、窗口外观、伪桌面标题栏
- `src/styles/attacks.css`：故障特效与结局演出附加动画
- `public/`：若后续需要音频或静态图像，可统一放这里；当前未启用以保持最轻骨架

## 参考文档

- 初始化设计：[docs/superpowers/specs/2026-04-18-project-init-design.md](docs/superpowers/specs/2026-04-18-project-init-design.md)
- 初始化计划：[docs/superpowers/plans/2026-04-18-project-init.md](docs/superpowers/plans/2026-04-18-project-init.md)
- 交接说明：[docs/HANDOFF.md](docs/HANDOFF.md)
