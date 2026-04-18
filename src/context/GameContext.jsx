import { createContext, useContext, useReducer } from "react";

import { createInitialGameState, gameReducer, PHASES } from "./gameState.js";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState,
  );

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }

  return context;
}

export { PHASES };
