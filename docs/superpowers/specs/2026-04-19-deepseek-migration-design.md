# H.O.R.S.E. v0.1 DeepSeek API 迁移设计

**日期：** 2026-04-19
**范围：** 仅覆盖后端 LLM 接入从 `OpenRouter` 切换为 `DeepSeek` 官方 API，不改动前端交互与游戏流程。

## 目标

把当前后端统一切换到 `DeepSeek` 官方接口，同时保持现有游戏逻辑调用方式不变：

- `server/handlers.js` 继续只依赖 `callLLM(systemPrompt, userMessage)`
- AI 返回结构仍然是 JSON 对象，兼容现有 Phase 2 / Phase 3 处理逻辑
- 未配置密钥、接口报错或模型返回异常内容时，仍走现有 fallback
- 真实密钥只放本地环境变量，不写入仓库代码

## 已确认约束

- 用户已确认使用 `DeepSeek` 官方 API，而不是继续经由 `OpenRouter`
- 当前后端 LLM 调用集中在 `server/llm.js`，适合做单点替换
- 测试已覆盖 URL、模型名、环境变量和 fallback 行为，需要同步迁移
- 仓库当前存在其它未提交前端改动，本次设计与实现应避免干扰这些文件

## 迁移方案

### 推荐方案：直接使用 DeepSeek Chat Completions 接口

- 请求地址改为 `https://api.deepseek.com/chat/completions`
- 认证头继续使用 `Authorization: Bearer <API_KEY>`
- 默认模型改为 `deepseek-chat`
- 环境变量从 `OPENROUTER_API_KEY` 迁移为 `DEEPSEEK_API_KEY`

选择这个方案的原因：

- 当前项目已经使用手写 `fetch` 调用，直连 REST 接口改动最小
- 不需要引入新的 SDK 封装或 provider 抽象
- 出错定位更直接，后续也更方便继续微调模型参数

### 不采用的方案

- 保留 `OpenRouter` 作为中间层：不符合用户这次“整体切到 DeepSeek”的目标
- 做双 provider 兼容：会增加配置和测试复杂度，当前没有明确收益

## 架构与职责

### `server/llm.js`

保留现有公开接口和大部分兜底逻辑，只替换以下内部细节：

- 常量名从 `OPENROUTER_URL` / `OPENROUTER_MODEL` 改为 `DEEPSEEK_URL` / `DEEPSEEK_MODEL`
- `hasConfiguredCredential` 改读 `DEEPSEEK_API_KEY`
- `callLLM` 改为向 DeepSeek 地址发请求
- 请求体仍发送：
  - `model`
  - `messages`

如果 DeepSeek 返回的 `choices[0].message.content` 是字符串化 JSON，则继续沿用现有解析逻辑；如果不是合法 JSON，则回退到 fallback。

### `server/.env.example`

示例配置改为：

- `DEEPSEEK_API_KEY=your_deepseek_api_key_here`
- `PORT=3001`

### 测试

`tests/handlers.test.js` 需要同步更新断言：

- 无密钥时读取 `DEEPSEEK_API_KEY`
- 请求地址断言改为 DeepSeek URL
- 模型常量断言改为 `DEEPSEEK_MODEL`
- 失败描述文案从 `OpenRouter` 调整为 `DeepSeek`

## 数据流

1. `handlePhase2` / `handlePhase3` 调用 `callLLM`
2. `callLLM` 从 `process.env.DEEPSEEK_API_KEY` 读取密钥
3. 若密钥不存在，直接返回 fallback JSON
4. 若密钥存在，则向 DeepSeek 发起 chat completion 请求
5. 解析返回内容中的 JSON 字符串
6. 解析成功则交给 handlers 继续补全默认值
7. 解析失败或请求失败则返回 fallback JSON

## 错误处理

- 缺少密钥：不抛错，直接 fallback
- HTTP 非 2xx：不抛错，直接 fallback
- 响应结构变化或内容不是 JSON：不抛错，直接 fallback
- 网络异常：不抛错，直接 fallback

这个策略保证本次迁移不会扩大故障影响面，前端在异常情况下仍能继续游戏流程。

## 验证策略

- 单元测试：
  - `callLLM` 在无 `DEEPSEEK_API_KEY` 时返回 fallback
  - `callLLM` 会向 DeepSeek URL 发送请求，并使用固定模型
  - DeepSeek 返回非法 JSON 时 fallback
  - DeepSeek 返回失败状态时 fallback
- 回归检查：
  - `handlePhase2` 和 `handlePhase3` 现有测试继续通过
- 配置检查：
  - `server/.env.example` 不再出现 `OPENROUTER_API_KEY`

## 非目标

- 不引入多 provider 配置体系
- 不修改 `server/handlers.js` 的业务接口
- 不改动前端 API 调用方式
- 不把真实 DeepSeek 密钥写入代码仓库
