import { useCallback, useEffect, useRef, useState } from "react";
import AIDialogue from "./components/AIDialogue.jsx";
import EndingLose from "./components/EndingLose.jsx";
import EndingWin from "./components/EndingWin.jsx";
import FakeDesktop from "./components/FakeDesktop.jsx";
import FirewallUI from "./components/FirewallUI.jsx";
import ShooterGame from "./components/ShooterGame.jsx";
import TrapModal from "./components/TrapModal.jsx";
import { GameProvider, PHASES, useGame } from "./context/GameContext.jsx";

const FILTER_ATTACKS = {
  blur: "blur(0.3px)",
  invert: "invert(0.15)",
};

const PHASE_COMPONENTS = {
  [PHASES.FACADE]: ShooterGame,
  [PHASES.GLITCH]: AIDialogue,
  [PHASES.FIREWALL]: FirewallUI,
  [PHASES.ENDING_LOSE]: EndingLose,
  [PHASES.ENDING_WIN]: EndingWin,
};

// --- Admin console (Shift+Space) ---
const PHASE_COMMANDS = {
  phase1: PHASES.FACADE,
  phase2: PHASES.GLITCH,
  phase3: PHASES.FIREWALL,
  lose: PHASES.ENDING_LOSE,
  win: PHASES.ENDING_WIN,
};

function AdminConsole({ onClose, dispatch }) {
  const [input, setInput] = useState("");
  const [log, setLog] = useState("Commands: phase1, phase2, phase3, lose, win, reset");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    const cmd = input.trim().toLowerCase();
    setInput("");
    if (cmd === "reset") {
      dispatch({ type: "RESET" });
      setLog(">> RESET done");
      return;
    }
    const phase = PHASE_COMMANDS[cmd];
    if (phase !== undefined) {
      dispatch({ type: "SET_CSS_ATTACK", payload: null });
      dispatch({ type: "SET_PHASE", payload: phase });
      setLog(`>> Switched to ${cmd}`);
    } else {
      setLog(`>> Unknown: "${cmd}"`);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-80 rounded border border-cyan-500/40 bg-gray-950 p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs text-cyan-400">ADMIN CONSOLE</span>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-white">{"\u00d7"}</button>
        </div>
        <p className="mb-2 font-mono text-xs text-gray-500">{log}</p>
        <div className="flex items-center gap-2 rounded border border-cyan-500/30 bg-black px-2 py-1">
          <span className="font-mono text-xs text-cyan-500">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } if (e.key === "Escape") onClose(); }}
            className="flex-1 bg-transparent font-mono text-sm text-cyan-400 placeholder-cyan-800 outline-none"
            placeholder="phase2..."
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

function GameRouter() {
  const { state, dispatch } = useGame();
  const ActiveComponent = PHASE_COMPONENTS[state.phase] ?? ShooterGame;
  const [showAdmin, setShowAdmin] = useState(false);

  // Shift+Space toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.shiftKey && e.code === "Space") {
        e.preventDefault();
        setShowAdmin((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  const showDesktop = !isEnding;

  const content = (
    <>
      <ActiveComponent />
      {showTrap && (
        <TrapModal
          trapType={trapType}
          battery={state.env?.battery}
          onTrick={handleTrick}
          onSafe={handleSafe}
        />
      )}
    </>
  );

  return (
    <main
      className={`min-h-screen text-white ${isEnding ? "bg-black" : ""} ${animationClasses}`.trim()}
      style={shellStyle}
    >
      {showDesktop ? <FakeDesktop>{content}</FakeDesktop> : content}
      {showAdmin && <AdminConsole onClose={() => setShowAdmin(false)} dispatch={dispatch} />}
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
