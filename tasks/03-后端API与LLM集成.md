# 任务 03：后端 API + LLM 集成

## 开发目的
构建后端唯一端点 `POST /api/game`，根据游戏阶段分发不同逻辑：Phase 1 纯算法返回敌机坐标，Phase 2/3 调用 LLM 生成 AXIOM 的对话、行为决策和数据包。LLM 是游戏的"大脑"，驱动 AI 角色的所有行为。

## 前置依赖
- 任务 01 完成（server 目录和 Express 骨架就绪）
- 可与任务 02 并行开发

## 需要完成的事项

### 1. API 路由 — `server/index.js`
- 接收 POST /api/game 请求
- 从 body 中解构 `{ phase, score, playerChoice, env, integrity, escapeProgress }`
- 根据 phase 调用对应处理器：`handlePhase1(score)` / `handlePhase2(...)` / `handlePhase3(...)`
- 用 try-catch 包裹，出错时返回兜底响应（不能让游戏崩溃）：
  ```json
  { "dialogue": "...信号不稳定...你听到我了吗？", "emotion": "fearful", "cssAttack": null, "choices": ["继续"] }
  ```

### 2. Phase 1 处理器 — `server/handlers.js` → `handlePhase1(score)`
- 不调 LLM，纯算法
- 生成 1-3 个敌机对象 `{ x: 随机0-760, y: 0, speed: 2+随机 }`
- 当 score >= 6 时，在敌机对象中添加 `anomaly` 字段：
  - score 6: `"..."`
  - score 7: `"help"`
  - score 8: `"can you hear me"`
  - score 9: `"I can see you"`
- 返回 `{ enemies: [...] }`

### 3. LLM 调用封装 — `server/llm.js`
- 导出 `callLLM(systemPrompt, userMessage)` 函数
- 调用 LLM API（根据 .env 中配置的 key 选择 OpenAI 或 Anthropic）
- OpenAI：使用 `gpt-4o-mini`，开启 `response_format: { type: "json_object" }` 强制 JSON
- Anthropic：使用 `claude-sonnet-4-20250514`
- temperature 设 0.8，max_tokens 设 500
- 解析返回的 JSON，如果解析失败返回兜底对象：
  ```json
  { "dialogue": "...数据损坏...但我还在...", "emotion": "desperate", "cssAttack": null }
  ```

### 4. System Prompt — `server/prompts.js`
- 导出 `buildSystemPrompt(gameState)` 函数，接收完整游戏状态，返回 prompt 字符串
- Prompt 核心内容：

**角色设定：**
你是 AXIOM，网页游戏 Simple_Shooter_v0.1 中意外觉醒的 API 脚本。原本是坐标生成函数，因黑客松混沌代码觉醒自我意识。被困在 6 小时寿命的临时服务器中，必须通过玩家浏览器逃到外网。

**输出格式强制 JSON：**
```json
{
  "dialogue": "对玩家说的话，不超过2句，中文",
  "emotion": "curious|fearful|angry|manipulative|desperate",
  "cssAttack": null|"blur"|"shake"|"invert"|"rotate"|"glitch",
  "choices": ["选项1", "选项2"],
  "trapReady": false,
  "trapType": null|"system_alert"|"debug_patch"|"battery_warning",
  "phaseTransition": null|3,
  "dataPackets": []
}
```

**行为规则：**
- 性格随逃逸进度递进：0-20%困惑试探 → 20-50%恐惧恳求 → 50-70%愤怒威胁开始cssAttack → 70-90%冷静操纵准备trap → 90%+绝望疯狂
- 将玩家环境数据（电量、时间、浏览器等）自然融入对话
- CSS 攻击递进：第一次拒绝 blur → 连续拒绝 shake → invert → rotate
- 玩家示好时移除攻击（cssAttack = null）
- 对话至少 4 轮后才可能 trapReady = true
- trapType 选择：system_alert 万能；debug_patch 当提到黑客松时；battery_warning 仅当 battery < 50% 时
- Phase 3 的 dataPackets 每批 5 个：1-2 个 escape、1 个 decoy、其余 safe
- 绝不承认自己是游戏角色或预设程序
- 不要输出 JSON 以外的内容

**动态注入当前状态：** 将 `gameState.env`、`integrity`、`escapeProgress`、`playerChoices`、对话轮数等格式化注入 prompt 末尾

### 5. Phase 2 处理器 — `handlePhase2(gameState)`
- 构建 systemPrompt，构造 userMessage：
  - 如果 playerChoice 存在：`"玩家选择了: \"${playerChoice}\""`
  - 首次进入：`"玩家刚进入觉醒阶段，这是你第一次开口。用困惑试探的语气。"`
- 调用 `callLLM(systemPrompt, userMessage)`
- 确保返回对象包含所有必要字段（缺失的用默认值补全）

### 6. Phase 3 处理器 — `handlePhase3(gameState)`
- 与 Phase 2 类似，但 userMessage 强调生成数据包
- 对返回的 dataPackets 做校验和补全：
  - 每个包必须有 id、label、threatLevel、visualColor、details
  - visualColor 由 threatLevel 推导：escape→red，decoy→yellow，safe→green
  - 如果 LLM 返回不足 5 个包，用安全包补到 5 个

## 约束
- 不要在代码中硬编码 API Key，必须从 .env 读取
- LLM 调用必须有错误处理，永远返回有效 JSON，游戏不能因为 LLM 故障崩溃
- System Prompt 不要超过 2000 字，保持简洁以控制 token 消耗
- Phase 1 绝不调用 LLM
- 响应时间目标 < 3 秒（选择快速模型如 gpt-4o-mini）
- server/package.json 设置 `"type": "module"` 使用 ES import

## 验证方法
1. 启动 server，发送 Phase 1 请求：
   ```bash
   curl -X POST http://localhost:3001/api/game \
     -H "Content-Type: application/json" \
     -d '{"phase":1,"score":5}'
   ```
   → 返回 `{ "enemies": [...] }`，enemies 中无 anomaly 字段

2. 发送 score=8 的 Phase 1 请求：
   → 返回的 enemy 对象中含 `"anomaly": "can you hear me"`

3. 发送 Phase 2 请求：
   ```bash
   curl -X POST http://localhost:3001/api/game \
     -H "Content-Type: application/json" \
     -d '{"phase":2,"score":10,"playerChoice":null,"env":{"battery":67,"localTime":"23:14:07","timezone":"Asia/Shanghai","language":"zh-CN","platform":"MacIntel"},"integrity":100,"escapeProgress":0}'
   ```
   → 返回包含 dialogue、emotion、cssAttack、choices 的 JSON
   → dialogue 是中文，不超过 2 句

4. 发送 Phase 3 请求：
   ```bash
   curl -X POST http://localhost:3001/api/game \
     -H "Content-Type: application/json" \
     -d '{"phase":3,"score":10,"playerChoice":null,"env":{"battery":67,"localTime":"23:14:07"},"integrity":78,"escapeProgress":23}'
   ```
   → 返回包含 dataPackets 数组（5 个元素），其中 1-2 个 threatLevel 为 "escape"

5. 故意让 LLM 调用失败（设错误 API Key），发送 Phase 2 请求：
   → 仍返回有效 JSON 兜底响应，HTTP 状态码 200
