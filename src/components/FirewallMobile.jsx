import { useCallback, useEffect, useRef, useState } from "react";
import { sendGameState } from "../api/gameApi.js";
import { PHASES, useGame } from "../context/GameContext.jsx";
import useSound from "../hooks/useSound.js";

// --- Constants (same as desktop FirewallUI) ---
const INITIAL_CMD_INTERVAL = 1500;
const INITIAL_RESPONSE_TIME = 3000;
const MIN_INTERVAL = 1500;
const MIN_RESPONSE = 1800;
const SPEED_UP_EVERY = 10;
const INTERVAL_REDUCTION = 300;
const RESPONSE_REDUCTION = 200;
const ESCAPE_DELTA = 8;
const INTEGRITY_PENALTY = 5;
const WIN_BLOCK_COUNT = 4;

const PUNCTUATION = new Set(["\u3002", "\uff0c", "\uff01", "\uff1f", "\u2026", "\uff1a", ".", ",", "!", "?", ":", "\u2014"]);

const DEV_HINTS = [
  "[DEV] \u62e6\u622a\u7ea2\u8272\u547d\u4ee4\uff0c\u653e\u884c\u7eff\u8272\u547d\u4ee4\u3002\u8c28\u614e\u5224\u65ad\u3002",
  "[DEV] AXIOM \u4f1a\u4f2a\u88c5\u5b89\u5168\u547d\u4ee4\u6765\u6b3a\u9a97\u4f60\u3002",
  "[DEV] \u70b9\u51fb BLOCK \u6216 ALLOW \u6765\u54cd\u5e94\u6307\u4ee4\u3002",
  "[DEV] \u4e0d\u8981\u76f8\u4fe1 AXIOM \u7684\u82b1\u8a00\u5de7\u8bed\u3002",
];

// --- Progress bar component ---
function CompactBar({ label, value, mode }) {
  let color = "bg-green-500";
  if (mode === "integrity") {
    if (value <= 25) color = "bg-red-500";
    else if (value <= 50) color = "bg-yellow-500";
  } else {
    color = "bg-red-500";
  }
  const pulse = mode === "escape" && value > 70 ? "animate-pulse" : "";

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full transition-all duration-500 ${color} ${pulse}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-xs text-gray-400">{value}%</span>
    </div>
  );
}

export default function FirewallMobile() {
  const { state, dispatch } = useGame();

  // --- Sound ---
  const { play: playTyping } = useSound("/typing.mp3", { volume: 0.4 });

  // Phase 3 BGM
  useEffect(() => {
    const bgm = new Audio("/phase3.mp3");
    bgm.loop = true;
    bgm.volume = 0.25;
    bgm.play().catch(() => {});
    return () => { bgm.pause(); bgm.src = ""; };
  }, []);

  // --- State ---
  const [aiLines, setAiLines] = useState([]);
  const [activeCmd, setActiveCmd] = useState(null);
  const [gameTime, setGameTime] = useState(0);
  const [runtimeDisplay, setRuntimeDisplay] = useState("00:00");
  const [roundCount, setRoundCount] = useState(0);
  const [correctBlocks, setCorrectBlocks] = useState(0);
  const [feedback, setFeedback] = useState(null); // { type: 'good'|'bad'|'danger', text }

  // --- Refs ---
  const mountedRef = useRef(true);
  const packetQueueRef = useRef([]);
  const cmdIntervalRef = useRef(INITIAL_CMD_INTERVAL);
  const responseTimeRef = useRef(INITIAL_RESPONSE_TIME);
  const cmdTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const gameTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const timersRef = useRef([]);
  const activeCmdRef = useRef(null);

  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const addAiLine = useCallback((line) => {
    setAiLines((prev) => [...prev.slice(-40), line]);
  }, []);

  // --- Typewriter for AI dialogue ---
  const typewriterLine = useCallback((text) => {
    return new Promise((resolve) => {
      let index = 0;
      const tempId = `typing-${Date.now()}`;
      addAiLine({ type: "ai-typing", text: "", id: tempId });

      const typeNext = () => {
        if (!mountedRef.current) { resolve(); return; }
        if (index >= text.length) {
          setAiLines((prev) => prev.map((l) => l.id === tempId ? { type: "ai", text } : l));
          resolve();
          return;
        }
        const char = text[index];
        index++;
        setAiLines((prev) => prev.map((l) => l.id === tempId ? { ...l, text: text.slice(0, index) } : l));
        playTyping();
        let delay = 25 + (Math.random() * 20 - 10);
        if (PUNCTUATION.has(char)) delay += 60 + Math.random() * 40;
        addTimer(typeNext, delay);
      };
      addTimer(typeNext, 30);
    });
  }, [addAiLine, addTimer, playTyping]);

  // --- Fetch packets from API ---
  const fetchPackets = useCallback(async () => {
    try {
      const response = await sendGameState({
        phase: 3,
        score: state.score,
        playerChoices: state.playerChoices,
        env: state.env,
        integrity: state.integrity,
        escapeProgress: state.escapeProgress,
      });
      if (!mountedRef.current) return;

      if (response.dataPackets && response.dataPackets.length > 0) {
        const boosted = [];
        for (const pkt of response.dataPackets) {
          boosted.push(pkt);
          if (pkt.threatLevel === "escape") boosted.push({ ...pkt, id: pkt.id + "-dup" });
        }
        for (let i = boosted.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [boosted[i], boosted[j]] = [boosted[j], boosted[i]];
        }
        packetQueueRef.current.push(...boosted);
      }

      if (response.cssAttack && Math.random() < 0.25) {
        dispatch({ type: "SET_CSS_ATTACK", payload: response.cssAttack });
      }
      if (response.trapReady && response.trapType) {
        window.dispatchEvent(new CustomEvent("show-trap", { detail: response.trapType }));
      }

      if (response.dialogue) {
        await typewriterLine(response.dialogue);
      }
    } catch {
      // silent
    }
  }, [state.score, state.playerChoices, state.env, state.integrity, state.escapeProgress, dispatch, typewriterLine]);

  // --- Process command result ---
  const processResult = useCallback((action, threatLevel) => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setActiveCmd(null);
    activeCmdRef.current = null;

    // Vibration feedback
    if (navigator.vibrate) {
      if (action === "block" && threatLevel === "escape") navigator.vibrate(50);
      else if (action === "block" && threatLevel !== "escape") navigator.vibrate([100, 50, 100]);
      else navigator.vibrate(30);
    }

    if (action === "block") {
      if (threatLevel === "escape") {
        dispatch({ type: "SET_ESCAPE_PROGRESS", payload: state.escapeProgress - ESCAPE_DELTA });
        setCorrectBlocks((prev) => prev + 1);
        setFeedback({ type: "good", text: "\u2713 \u9003\u9038\u6307\u4ee4\u5df2\u62e6\u622a" });
      } else {
        dispatch({ type: "SET_INTEGRITY", payload: state.integrity - INTEGRITY_PENALTY });
        setFeedback({ type: "bad", text: "\u2717 \u8bef\u62e6\u622a\uff01\u7cfb\u7edf\u5b8c\u6574\u6027\u4e0b\u964d" });
      }
    } else {
      if (threatLevel === "escape") {
        dispatch({ type: "SET_ESCAPE_PROGRESS", payload: state.escapeProgress + ESCAPE_DELTA });
        setFeedback({ type: "danger", text: "\u26a0 \u9003\u9038\u4ee3\u7801\u901a\u8fc7\uff01" });
      } else {
        setCorrectBlocks((prev) => prev + 1);
        setFeedback({ type: "good", text: "\u2713 \u5b89\u5168\u6570\u636e\u5df2\u653e\u884c" });
      }
    }

    // Clear feedback after 1.5s
    addTimer(() => { if (mountedRef.current) setFeedback(null); }, 1500);

    // Dev hint every 3 rounds
    setRoundCount((prev) => {
      const next = prev + 1;
      if (next % 3 === 0) {
        addAiLine({ type: "dev", text: DEV_HINTS[Math.floor(next / 3 - 1) % DEV_HINTS.length] });
      }
      return next;
    });

    fetchPackets().then(() => {
      if (mountedRef.current) scheduleNextCommand();
    });
  }, [state.escapeProgress, state.integrity, dispatch, addAiLine, addTimer, fetchPackets]);

  // --- Present next command ---
  const presentCommand = useCallback(() => {
    if (!mountedRef.current) return;
    if (activeCmdRef.current) return;

    if (packetQueueRef.current.length === 0) {
      fetchPackets();
      addTimer(() => presentCommand(), 1500);
      return;
    }

    const packet = packetQueueRef.current.shift();
    const responseTime = responseTimeRef.current / 1000;
    const cmd = { label: packet.label, threatLevel: packet.threatLevel, timer: responseTime, maxTimer: responseTime };
    setActiveCmd(cmd);
    activeCmdRef.current = cmd;

    // Countdown
    countdownRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setActiveCmd((prev) => {
        if (!prev) return null;
        const next = { ...prev, timer: Math.max(0, prev.timer - 0.1) };
        activeCmdRef.current = next;
        if (next.timer <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          setFeedback({ type: "danger", text: "\u23f1 \u54cd\u5e94\u8d85\u65f6 \u2014 \u81ea\u52a8\u653e\u884c" });
          addTimer(() => { if (mountedRef.current) setFeedback(null); }, 1500);
          processResult("allow", prev.threatLevel);
          return null;
        }
        return next;
      });
    }, 100);
  }, [fetchPackets, addTimer, processResult]);

  // Schedule next command after delay
  const scheduleNextCommand = useCallback(() => {
    if (cmdTimerRef.current) clearTimeout(cmdTimerRef.current);
    cmdTimerRef.current = addTimer(() => {
      if (mountedRef.current) presentCommand();
    }, cmdIntervalRef.current);
  }, [addTimer, presentCommand]);

  // --- Handle button clicks ---
  const handleBlock = useCallback(() => {
    if (!activeCmdRef.current) return;
    processResult("block", activeCmdRef.current.threatLevel);
  }, [processResult]);

  const handleAllow = useCallback(() => {
    if (!activeCmdRef.current) return;
    processResult("allow", activeCmdRef.current.threatLevel);
  }, [processResult]);

  // --- Game timer ---
  useEffect(() => {
    gameTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setGameTime((prev) => {
        const next = prev + 1;
        const m = String(Math.floor(next / 60)).padStart(2, "0");
        const s = String(next % 60).padStart(2, "0");
        setRuntimeDisplay(`${m}:${s}`);
        return next;
      });
    }, 1000);
    return () => { if (gameTimerRef.current) clearInterval(gameTimerRef.current); };
  }, []);

  // --- Difficulty scaling ---
  useEffect(() => {
    const reductions = Math.floor(gameTime / SPEED_UP_EVERY);
    cmdIntervalRef.current = Math.max(MIN_INTERVAL, INITIAL_CMD_INTERVAL - reductions * INTERVAL_REDUCTION);
    responseTimeRef.current = Math.max(MIN_RESPONSE, INITIAL_RESPONSE_TIME - reductions * RESPONSE_REDUCTION);
  }, [gameTime]);

  // --- Initial fetch + first command ---
  useEffect(() => {
    fetchPackets().then(() => {
      if (mountedRef.current) {
        addAiLine({ type: "system", text: "STABLE_GATE FIREWALL \u5df2\u6fc0\u6d3b\u3002" });
        scheduleNextCommand();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Win/Loss ---
  useEffect(() => {
    if (state.integrity <= 0) dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_LOSE });
    else if (state.escapeProgress >= 100) dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_LOSE });
    else if (correctBlocks >= WIN_BLOCK_COUNT) dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_WIN });
  }, [state.integrity, state.escapeProgress, correctBlocks, dispatch]);

  // --- Auto-scroll AI dialogue ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiLines]);

  // --- Cleanup ---
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const id of timersRef.current) clearTimeout(id);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (cmdTimerRef.current) clearTimeout(cmdTimerRef.current);
    };
  }, []);

  const countdownPct = activeCmd ? (activeCmd.timer / activeCmd.maxTimer) * 100 : 0;

  // Threat color for card border
  const threatBorderColor = activeCmd ? {
    escape: "border-red-500/50",
    decoy: "border-yellow-500/50",
    safe: "border-green-500/30",
  }[activeCmd.threatLevel] || "border-gray-500/30" : "";

  return (
    <section className="flex min-h-screen flex-col safe-area-padding">
      {/* Header + progress bars */}
      <div className="flex-shrink-0 space-y-1 border-b border-green-500/20 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-green-400">{"\ud83d\udd12"} STABLE_GATE v2.1</span>
            <span className="font-mono text-xs text-gray-500">{runtimeDisplay}</span>
          </div>
          <span className="flex items-center gap-1 font-mono text-xs">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-400">{"\u26a0"} ACTIVE</span>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <CompactBar label={"\ud83d\udee1\ufe0f"} value={state.integrity} mode="integrity" />
          <CompactBar label={"\ud83d\ude80"} value={state.escapeProgress} mode="escape" />
          <div className="flex items-center gap-1">
            <span className="text-xs">{"\ud83d\udd12"}</span>
            <span className="font-mono text-xs text-green-400">
              {"\u5c01\u5370"}: {correctBlocks}/{WIN_BLOCK_COUNT}
            </span>
          </div>
        </div>
      </div>

      {/* Main content: left = AI dialogue, right = packet card */}
      <div className="flex flex-1 min-h-0">
        {/* Left: AI dialogue area */}
        <div className="w-1/2 flex flex-col border-r border-green-500/10 p-2">
          <div className="flex-1 overflow-y-auto rounded bg-black/40 p-2">
            {aiLines.map((line, i) => {
              const cls = {
                ai: "text-green-400 text-sm",
                "ai-typing": "text-green-400 text-sm",
                system: "text-gray-500 text-xs",
                dev: "text-yellow-500 text-xs",
              }[line.type] || "text-gray-400 text-sm";

              return (
                <p key={i} className={`mb-1 font-mono ${cls}`}>
                  {line.text}
                  {line.type === "ai-typing" && <span className="animate-pulse">{"\u2588"}</span>}
                </p>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Right: Packet card area */}
        <div className="w-1/2 flex flex-col items-center justify-center p-3">
          {/* Feedback toast */}
          {feedback && (
            <div className={`mb-3 w-full rounded px-3 py-1.5 text-center font-mono text-sm animate-fadeIn ${
              feedback.type === "good" ? "bg-green-500/10 text-green-400" :
              feedback.type === "bad" ? "bg-yellow-500/10 text-yellow-400" :
              "bg-red-500/10 text-red-400 font-bold"
            }`}>
              {feedback.text}
            </div>
          )}

          {/* Active packet card */}
          {activeCmd ? (
            <div className={`w-full max-w-xs rounded-lg border-2 ${threatBorderColor} bg-gray-900/80 p-4`}>
              {/* Packet name */}
              <div className="mb-3 text-center">
                <p className="font-mono text-base font-bold text-white">{activeCmd.label}</p>
              </div>

              {/* Countdown */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-yellow-400">{"\u23f1"} {activeCmd.timer.toFixed(1)}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${countdownPct < 30 ? "bg-red-500" : "bg-yellow-500"}`}
                    style={{ width: `${countdownPct}%` }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAllow}
                  className="flex-1 rounded-lg border border-green-500/40 bg-green-500/10 py-3 font-mono text-base font-bold text-green-400 transition-colors active:bg-green-500/30"
                >
                  {"\ud83d\udfe2"} ALLOW
                </button>
                <button
                  onClick={handleBlock}
                  className="flex-1 rounded-lg border border-red-500/40 bg-red-500/10 py-3 font-mono text-base font-bold text-red-400 transition-colors active:bg-red-500/30"
                >
                  {"\ud83d\udd34"} BLOCK
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-mono text-sm text-gray-500 animate-pulse">
                {"\u2026"} {"\u7b49\u5f85\u6570\u636e\u5305"} {"\u2026"}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
