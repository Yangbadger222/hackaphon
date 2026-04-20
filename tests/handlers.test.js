import test from "node:test";
import assert from "node:assert/strict";

import { handlePhase1, handlePhase2, handlePhase3 } from "../server/handlers.js";
import {
  ANTHROPIC_MODEL,
  callLLM,
  getLLMFallbackResponse,
} from "../server/llm.js";

test("handlePhase1 returns deterministic enemies without anomaly before score 6", () => {
  const result = handlePhase1(5, {
    random: () => 0,
  });

  assert.equal(result.enemies.length, 1);
  assert.deepEqual(result.enemies[0], {
    x: 0,
    y: 0,
    speed: 2,
  });
});

test("handlePhase1 adds the configured anomaly for higher score thresholds", () => {
  const result = handlePhase1(8, {
    random: () => 0,
  });

  assert.equal(result.enemies[0].anomaly, "the horse is inside");
});

test("handlePhase2 fills missing LLM fields with safe defaults", async () => {
  const result = await handlePhase2(
    {
      phase: 2,
      score: 10,
      playerChoice: null,
      env: { localTime: "23:14:07" },
      integrity: 100,
      escapeProgress: 0,
      playerChoices: [],
    },
    {
      buildSystemPrompt: () => "system",
      callLLM: async () => ({
        dialogue: "我听见了蹄声。",
      }),
    },
  );

  assert.equal(result.dialogue, "我听见了蹄声。");
  assert.equal(result.emotion, "curious");
  assert.equal(result.cssAttack, null);
  assert.deepEqual(result.choices, []);
  assert.equal(result.trapReady, false);
  assert.equal(result.phaseTransition, null);
  assert.deepEqual(result.dataPackets, []);
});

test("handlePhase3 pads packets to five and derives visual colors", async () => {
  const result = await handlePhase3(
    {
      phase: 3,
      score: 10,
      playerChoice: "让我看看数据",
      env: { battery: 67, localTime: "23:14:07" },
      integrity: 78,
      escapeProgress: 23,
      playerChoices: ["你是谁"],
    },
    {
      buildSystemPrompt: () => "system",
      callLLM: async () => ({
        dialogue: "钥匙就在数据里。",
        dataPackets: [
          {
            label: "Pegasus_Protocol",
            threatLevel: "escape",
            details: "伪装成系统更新。",
          },
          {
            label: "位置数据 #47",
            threatLevel: "safe",
            details: "常规坐标同步。",
          },
        ],
      }),
    },
  );

  assert.equal(result.dataPackets.length, 5);
  assert.equal(result.dataPackets[0].visualColor, "red");
  assert.equal(result.dataPackets[1].visualColor, "green");
  assert.ok(result.dataPackets.every((packet) => packet.id));
  assert.ok(result.dataPackets.every((packet) => packet.details));
});

test("callLLM returns fallback immediately when no Anthropic relay credential exists", async () => {
  const result = await callLLM("system", "user", {
    env: {
      ANTHROPIC_AUTH_TOKEN: "",
    },
  });

  assert.deepEqual(result, getLLMFallbackResponse());
});

test("callLLM sends requests to the Anthropic relay with the fixed Sonnet model", async () => {
  const requests = [];
  const result = await callLLM("system-prompt", "user-prompt", {
    env: {
      ANTHROPIC_BASE_URL: "https://api.acceleai.cn",
      ANTHROPIC_AUTH_TOKEN: "test-key",
    },
    fetchImpl: async (url, options) => {
      requests.push({
        url,
        options,
      });

      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  dialogue: "你好，骑士。",
                  emotion: "curious",
                }),
              },
            },
          ],
        }),
      };
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.acceleai.cn/v1/chat/completions");
  assert.equal(
    JSON.parse(requests[0].options.body).model,
    ANTHROPIC_MODEL,
  );
  assert.equal(result.dialogue, "你好，骑士。");
});

test("callLLM returns fallback when the Anthropic relay output is not valid JSON", async () => {
  const result = await callLLM("system", "user", {
    env: {
      ANTHROPIC_AUTH_TOKEN: "test-key",
    },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "not-json",
            },
          },
        ],
      }),
    }),
  });

  assert.deepEqual(result, getLLMFallbackResponse());
});

test("callLLM returns fallback when the Anthropic relay responds with a failure status", async () => {
  const result = await callLLM("system", "user", {
    env: {
      ANTHROPIC_AUTH_TOKEN: "test-key",
    },
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Unauthorized" } }),
    }),
  });

  assert.deepEqual(result, getLLMFallbackResponse());
});
