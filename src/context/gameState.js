export const PHASES = {
  FACADE: 1,
  GLITCH: 2,
  FIREWALL: 3,
  ENDING_LOSE: 4,
  ENDING_WIN: 5,
};

export function clampPercentage(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numericValue));
}

export function createInitialGameState() {
  return {
    phase: PHASES.FACADE,
    score: 0,
    playerChoices: [],
    env: {},
    integrity: 100,
    escapeProgress: 50,
    cssAttacks: [],
    dialogueHistory: [],
    gameStartTime: Date.now(),
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "SET_PHASE":
      return {
        ...state,
        phase: action.payload,
      };
    case "INCREMENT_SCORE":
      return {
        ...state,
        score: state.score + 1,
      };
    case "ADD_CHOICE":
      return {
        ...state,
        playerChoices: action.payload
          ? [...state.playerChoices, action.payload]
          : state.playerChoices,
      };
    case "SET_ENV":
      return {
        ...state,
        env: action.payload ?? {},
      };
    case "SET_CSS_ATTACK": {
      if (action.payload === null) {
        return {
          ...state,
          cssAttacks: [],
        };
      }

      if (
        typeof action.payload !== "string" ||
        state.cssAttacks.includes(action.payload)
      ) {
        return state;
      }

      return {
        ...state,
        cssAttacks: [...state.cssAttacks, action.payload],
      };
    }
    case "SET_INTEGRITY":
      return {
        ...state,
        integrity: clampPercentage(action.payload),
      };
    case "SET_ESCAPE_PROGRESS":
      return {
        ...state,
        escapeProgress: clampPercentage(action.payload),
      };
    case "ADD_DIALOGUE":
      return {
        ...state,
        dialogueHistory:
          action.payload === undefined
            ? state.dialogueHistory
            : [...state.dialogueHistory, action.payload],
      };
    case "RESET":
      return createInitialGameState();
    default:
      return state;
  }
}
