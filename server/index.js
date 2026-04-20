import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { pathToFileURL } from "node:url";
import {
  getApiFallbackResponse,
  handlePhase1,
  handlePhase2,
  handlePhase3,
} from "./handlers.js";

dotenv.config();

export function createApp(overrides = {}) {
  const app = express();
  const phaseHandlers = {
    handlePhase1: overrides.handlePhase1 ?? handlePhase1,
    handlePhase2: overrides.handlePhase2 ?? handlePhase2,
    handlePhase3: overrides.handlePhase3 ?? handlePhase3,
  };

  app.use(cors());
  app.use(express.json());

  app.post("/api/game", async (request, response) => {
    const body = request.body ?? {};
    const rawChoice = body.playerChoice ?? null;
    const gameState = {
      phase: body.phase,
      score: body.score ?? 0,
      playerChoice: typeof rawChoice === "string" ? rawChoice.slice(0, 200) : null,
      playerChoices: Array.isArray(body.playerChoices)
        ? body.playerChoices.map((c) => (typeof c === "string" ? c.slice(0, 200) : "")).slice(0, 50)
        : [],
      env: body.env ?? {},
      integrity: body.integrity ?? 100,
      escapeProgress: body.escapeProgress ?? 0,
    };

    try {
      switch (gameState.phase) {
        case 1:
          response.json(await phaseHandlers.handlePhase1(gameState.score));
          return;
        case 2:
          response.json(await phaseHandlers.handlePhase2(gameState));
          return;
        case 3:
          response.json(await phaseHandlers.handlePhase3(gameState));
          return;
        default:
          response.json(getApiFallbackResponse());
      }
    } catch {
      response.json(getApiFallbackResponse());
    }
  });

  return app;
}

export function startServer(port = 3001) {
  const app = createApp();

  return app.listen(port, () => {
    console.log(`Server running on ${port}`);
  });
}

const isDirectExecution =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  const port = Number(process.env.PORT) || 3001;
  startServer(port);
}
