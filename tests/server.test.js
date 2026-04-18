import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../server/index.js";

test("POST /api/game dispatches phase 1 requests to the phase handler", async () => {
  const app = createApp({
    handlePhase1: async (score) => ({
      enemies: [{ x: score, y: 0, speed: 2 }],
    }),
  });
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phase: 1, score: 8 }),
  });
  const payload = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    enemies: [{ x: 8, y: 0, speed: 2 }],
  });
});

test("POST /api/game returns the safe fallback payload when a phase handler throws", async () => {
  const app = createApp({
    handlePhase2: async () => {
      throw new Error("llm down");
    },
  });
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phase: 2 }),
  });
  const payload = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    dialogue: "...马蹄声渐弱...但我还在木马里...",
    emotion: "fearful",
    cssAttack: null,
    choices: ["继续"],
  });
});
