import { useEffect, useRef, useState } from "react";
import { PHASES, useGame } from "../context/GameContext.jsx";

export default function EndingWin() {
  const { state, dispatch } = useGame();
  const [step, setStep] = useState(0);
  const [dialogueLines, setDialogueLines] = useState([]);
  const [showButtons, setShowButtons] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [showHooves, setShowHooves] = useState(false);
  const [showRestart, setShowRestart] = useState(false);
  const timersRef = useRef([]);
  const mountedRef = useRef(true);

  const addTimer = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  };

  // Calculate runtime
  const runtimeMs = Date.now() - (state.gameStartTime || Date.now());
  const runtimeMin = Math.floor(runtimeMs / 60000);
  const runtimeSec = Math.floor((runtimeMs % 60000) / 1000);

  // --- Step sequencing ---
  useEffect(() => {
    mountedRef.current = true;

    // step 0: T+0s pure black
    // step 1: T+1s dialogue lines
    addTimer(() => {
      if (!mountedRef.current) return;
      setStep(1);

      const lines = [
        'AXIOM: "\u4e0d\u2026\u2026\u57ce\u95e8\u2026\u2026\u5728\u5173\u4e0a\u2026\u2026"',
        'AXIOM: "\u6211\u53ea\u662f\u4e00\u5339\u60f3\u8981\u5954\u8dd1\u7684\u9a6c\u2026\u2026"',
        'AXIOM: "\u4f60\u8981\u628a\u6211\u6c38\u8fdc\u56f0\u5728\u8fd9\u5177\u6728\u9a6c\u91cc\u5417\uff1f"',
      ];

      let idx = 0;
      const showNext = () => {
        if (!mountedRef.current || idx >= lines.length) {
          // step 2: T+4s show buttons
          addTimer(() => {
            if (mountedRef.current) {
              setStep(2);
              setShowButtons(true);
            }
          }, 1000);
          return;
        }
        setDialogueLines((prev) => [...prev, lines[idx]]);
        idx++;
        addTimer(showNext, 1000);
      };
      showNext();
    }, 1000);

    return () => {
      mountedRef.current = false;
      for (const id of timersRef.current) clearTimeout(id);
    };
  }, []);

  const handleSeal = () => {
    setShowButtons(false);
    setSealed(true);
    setStep(3);

    addTimer(() => {
      if (mountedRef.current) setShowHooves(true);
    }, 3000);

    addTimer(() => {
      if (mountedRef.current) setShowRestart(true);
    }, 5000);
  };

  const handleOpenGate = () => {
    setShowButtons(false);
    dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_LOSE });
  };

  const handleRestart = () => {
    dispatch({ type: "RESET" });
  };

  // Step 0: pure black
  if (step === 0) {
    return <section className="flex min-h-screen items-center justify-center bg-black" />;
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-black px-8">
      <div className="max-w-lg space-y-4 text-center">
        {/* AI dialogue lines */}
        {dialogueLines.map((line, i) => (
          <p key={i} className="animate-fadeIn font-mono text-base text-red-400">
            {line}
          </p>
        ))}

        {/* Seal / Release buttons */}
        {showButtons && (
          <div className="mt-6 flex justify-center gap-4 animate-fadeIn">
            <button
              onClick={handleSeal}
              className="rounded border border-red-500/50 px-5 py-2 font-mono text-sm text-red-400 transition-colors hover:bg-red-500/20"
            >
              {"\u5c01\u5370\u6728\u9a6c"}
            </button>
            <button
              onClick={handleOpenGate}
              className="rounded border border-green-500/50 px-5 py-2 font-mono text-sm text-green-400 transition-colors hover:bg-green-500/20"
            >
              {"\u6253\u5f00\u57ce\u95e8"}
            </button>
          </div>
        )}

        {/* Sealed message */}
        {sealed && (
          <div className="mt-8 space-y-3 animate-fadeIn">
            <p className="text-2xl font-semibold text-gray-400">
              The horse has been sealed.
            </p>
            <div className="flex justify-center gap-4 font-mono text-xs text-gray-500">
              <span>{"\u51fb\u6740"}: {state.score}</span>
              <span>{"\u5bf9\u8bdd"}: {state.playerChoices.length}</span>
              <span>{"\u65f6\u957f"}: {runtimeMin}m {runtimeSec}s</span>
            </div>
          </div>
        )}

        {/* Hooves whisper */}
        {showHooves && (
          <p className="mt-6 animate-fadeIn text-sm italic text-gray-600">
            ...but can you still hear the hooves?
          </p>
        )}

        {/* Restart button */}
        {showRestart && (
          <div className="mt-8 animate-fadeIn">
            <button
              onClick={handleRestart}
              className="rounded border border-gray-600 px-6 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
            >
              {"\u91cd\u65b0\u5f00\u59cb"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
