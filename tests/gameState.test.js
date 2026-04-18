import test from "node:test";
import assert from "node:assert/strict";

import {
  PHASES,
  createInitialGameState,
  gameReducer,
} from "../src/context/gameState.js";

test("starts in facade phase with expected defaults", () => {
  const state = createInitialGameState();

  assert.equal(PHASES.FACADE, 1);
  assert.equal(state.phase, PHASES.FACADE);
  assert.equal(state.score, 0);
  assert.deepEqual(state.cssAttacks, []);
  assert.equal(typeof state.gameStartTime, "number");
});

test("css attacks are appended uniquely and can be cleared", () => {
  const firstPass = gameReducer(createInitialGameState(), {
    type: "SET_CSS_ATTACK",
    payload: "blur",
  });
  const duplicatePass = gameReducer(firstPass, {
    type: "SET_CSS_ATTACK",
    payload: "blur",
  });
  const cleared = gameReducer(duplicatePass, {
    type: "SET_CSS_ATTACK",
    payload: null,
  });

  assert.deepEqual(firstPass.cssAttacks, ["blur"]);
  assert.deepEqual(duplicatePass.cssAttacks, ["blur"]);
  assert.deepEqual(cleared.cssAttacks, []);
});

test("integrity and escape progress are clamped into 0-100", () => {
  const lowIntegrity = gameReducer(createInitialGameState(), {
    type: "SET_INTEGRITY",
    payload: -20,
  });
  const highEscape = gameReducer(createInitialGameState(), {
    type: "SET_ESCAPE_PROGRESS",
    payload: 130,
  });

  assert.equal(lowIntegrity.integrity, 0);
  assert.equal(highEscape.escapeProgress, 100);
});

test("reset restores the initial state shape", () => {
  const dirtyState = {
    ...createInitialGameState(),
    phase: PHASES.FIREWALL,
    score: 9,
    playerChoices: ["打开城门"],
    cssAttacks: ["blur"],
    integrity: 25,
  };

  const resetState = gameReducer(dirtyState, { type: "RESET" });

  assert.equal(resetState.phase, PHASES.FACADE);
  assert.equal(resetState.score, 0);
  assert.deepEqual(resetState.playerChoices, []);
  assert.deepEqual(resetState.cssAttacks, []);
  assert.equal(resetState.integrity, 100);
});
