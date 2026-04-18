import { useCallback, useEffect, useRef, useState } from "react";
import AIDialogue from "./components/AIDialogue.jsx";
import EndingLose from "./components/EndingLose.jsx";
import EndingWin from "./components/EndingWin.jsx";
import FirewallUI from "./components/FirewallUI.jsx";
import ShooterGame from "./components/ShooterGame.jsx";
import TrapModal from "./components/TrapModal.jsx";
import { GameProvider, PHASES, useGame } from "./context/GameContext.jsx";

const FILTER_ATTACKS = {
  blur: "blur(0.5px)",
  invert: "invert(1)",
};

const PHASE_COMPONENTS = {
  [PHASES.FACADE]: ShooterGame,
  [PHASES.GLITCH]: AIDialogue,
  [PHASES.FIREWALL]: FirewallUI,
  [PHASES.ENDING_LOSE]: EndingLose,
  [PHASES.ENDING_WIN]: EndingWin,
};

function GameRouter() {
  const { state, dispatch } = useGame();
  const ActiveComponent = PHASE_COMPONENTS[state.phase] ?? ShooterGame;

  // --- Trap modal state (one-shot: only triggers once per game) ---
  const [showTrap, setShowTrap] = useState(false);
  const [trapType, setTrapType] = useState("system_alert");
  const trapFiredRef = useRef(false);

  useEffect(() => {
    const handler = (e) => {
      if (trapFiredRef.current) return; // already shown once, ignore
      trapFiredRef.current = true;
      setTrapType(e.detail || "system_alert");
      setShowTrap(true);
    };
    window.addEventListener("show-trap", handler);
    return () => window.removeEventListener("show-trap", handler);
  }, []);

  // Reset trap guard on game reset (phase back to FACADE)
  useEffect(() => {
    if (state.phase === PHASES.FACADE) {
      trapFiredRef.current = false;
    }
  }, [state.phase]);

  const handleTrick = useCallback(() => {
    setShowTrap(false);
    dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_LOSE });
  }, [dispatch]);

  const handleSafe = useCallback(() => {
    setShowTrap(false);
  }, []);

  // --- Clear CSS attacks and close trap when entering ending phases ---
  const isEnding =
    state.phase === PHASES.ENDING_LOSE || state.phase === PHASES.ENDING_WIN;

  useEffect(() => {
    if (isEnding) {
      dispatch({ type: "SET_CSS_ATTACK", payload: null });
      setShowTrap(false);
    }
  }, [isEnding, dispatch]);

  // --- CSS attacks ---
  const filterEffects = state.cssAttacks
    .filter((attack) => FILTER_ATTACKS[attack])
    .map((attack) => FILTER_ATTACKS[attack]);

  const animationClasses = state.cssAttacks
    .filter((attack) => !FILTER_ATTACKS[attack])
    .map((attack) => `attack-${attack}`)
    .join(" ");

  const shellStyle =
    filterEffects.length > 0 ? { filter: filterEffects.join(" ") } : undefined;

  return (
    <main
      className={`min-h-screen bg-black text-white ${animationClasses}`.trim()}
      style={shellStyle}
    >
      <ActiveComponent />
      {showTrap && (
        <TrapModal
          trapType={trapType}
          battery={state.env?.battery}
          onTrick={handleTrick}
          onSafe={handleSafe}
        />
      )}
    </main>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
