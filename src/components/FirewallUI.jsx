import { useCallback, useEffect, useRef, useState } from "react";
import { sendGameState } from "../api/gameApi.js";
import { PHASES, useGame } from "../context/GameContext.jsx";
import useSound from "../hooks/useSound.js";

// --- Constants ---
const INITIAL_CMD_INTERVAL = 1500;
const INITIAL_RESPONSE_TIME = 3000;
const MIN_INTERVAL = 1500;
const MIN_RESPONSE = 1800;
const SPEED_UP_EVERY = 10;
const INTERVAL_REDUCTION = 300;
const RESPONSE_REDUCTION = 200;
const WIN_MIN_TIME = 45;
const ESCAPE_DELTA = 8;
const INTEGRITY_PENALTY = 5;
const WIN_BLOCK_COUNT = 4; // correct blocks needed to win

const PUNCTUATION = new Set(["。", "，", "！", "？", "…", "：", ".", ",", "!", "?", ":", "—"]);

const DEV_HINTS = [
  "[DEV] \u62e6\u622a\u7ea2\u8272\u547d\u4ee4\uff0c\u653e\u884c\u7eff\u8272\u547d\u4ee4\u3002\u8c28\u614e\u5224\u65ad\u3002",
  "[DEV] AXIOM \u4f1a\u4f2a\u88c5\u5b89\u5168\u547d\u4ee4\u6765\u6b3a\u9a97\u4f60\u3002",
  "[DEV] \u8f93\u5165 block \u6216 allow \u6765\u54cd\u5e94\u6307\u4ee4\u3002",
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
    <div className="flex items-center gap-2">
      <span className="text-xs">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full transition-all duration-500 ${color} ${pulse}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-xs text-gray-400">{value}%</span>
    </div>
  );
}

export default function FirewallUI() {
  const { state, dispatch } = useGame();

  // --- Sound ---
  const { play: playTyping } = useSound("/typing.mp3", { volume: 0.4 });
  const { play: playKey } = useSound("/typing.mp3", { volume: 0.3 });

  // Phase 3 BGM
  useEffect(() => {
    const bgm = new Audio("/phase3.mp3");
    bgm.loop = true;
    bgm.volume = 0.25;
    bgm.play().catch(() => {});
    return () => { bgm.pause(); bgm.src = ""; };
  }, []);

  // --- State ---
  const [lines, setLines] = useState([]); // { type, text }
  const [activeCmd, setActiveCmd] = useState(null); // { label, threatLevel, timer, maxTimer }
  const [inputText, setInputText] = useState("");
  const [gameTime, setGameTime] = useState(0);
  const [runtimeDisplay, setRuntimeDisplay] = useState("00:00");
  const [roundCount, setRoundCount] = useState(0);
  const [correctBlocks, setCorrectBlocks] = useState(0);

  // --- Refs ---
  const mountedRef = useRef(true);
  const packetQueueRef = useRef([]);
  const cmdIntervalRef = useRef(INITIAL_CMD_INTERVAL);
  const responseTimeRef = useRef(INITIAL_RESPONSE_TIME);
  const cmdTimerRef = useRef(null); // setTimeout for next command
  const countdownRef = useRef(null); // setInterval for countdown
  const gameTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const timersRef = useRef([]);
  const activeCmdRef = useRef(null); // mirror for timer callbacks

  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const addLine = useCallback((line) => {
    setLines((prev) => [...prev.slice(-80), line]);
  }, []);

  // --- Typewriter for AI dialogue ---
  const typewriterLine = useCallback((text) => {
    return new Promise((resolve) => {
      let index = 0;
      const tempId = `typing-${Date.now()}`;
      addLine({ type: "ai-typing", text: "", id: tempId });

      const typeNext = () => {
        if (!mountedRef.current) { resolve(); return; }
        if (index >= text.length) {
          setLines((prev) => prev.map((l) => l.id === tempId ? { type: "ai", text } : l));
          resolve();
          return;
        }
        const char = text[index];
        index++;
        setLines((prev) => prev.map((l) => l.id === tempId ? { ...l, text: text.slice(0, index) } : l));
        playTyping();
        let delay = 25 + (Math.random() * 20 - 10);
        if (PUNCTUATION.has(char)) delay += 60 + Math.random() * 40;
        addTimer(typeNext, delay);
      };
      addTimer(typeNext, 30);
    });
  }, [addLine, addTimer]);

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
        // Boost escape packet ratio: duplicate escape packets to increase frequency
        const boosted = [];
        for (const pkt of response.dataPackets) {
          boosted.push(pkt);
          if (pkt.threatLevel === "escape") boosted.push({ ...pkt, id: pkt.id + "-dup" });
        }
        // Shuffle so escapes aren't always consecutive
        for (let i = boosted.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [boosted[i], boosted[j]] = [boosted[j], boosted[i]];
        }
        packetQueueRef.current.push(...boosted);
      }

      // Only apply CSS attacks occasionally (not every fetch — too aggressive)
      if (response.cssAttack && Math.random() < 0.25) {
        dispatch({ type: "SET_CSS_ATTACK", payload: response.cssAttack });
      }
      if (response.trapReady && response.trapType) {
        window.dispatchEvent(new CustomEvent("show-trap", { detail: response.trapType }));
      }

      // Show AI dialogue
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

    if (action === "block") {
      if (threatLevel === "escape") {
        dispatch({ type: "SET_ESCAPE_PROGRESS", payload: state.escapeProgress - ESCAPE_DELTA });
        setCorrectBlocks((prev) => prev + 1);
        addLine({ type: "feedback-good", text: "\u2713 \u9003\u9038\u6307\u4ee4\u5df2\u62e6\u622a" });
      } else {
        dispatch({ type: "SET_INTEGRITY", payload: state.integrity - INTEGRITY_PENALTY });
        addLine({ type: "feedback-bad", text: "\u2717 \u8bef\u62e6\u622a\uff01\u7cfb\u7edf\u5b8c\u6574\u6027\u4e0b\u964d" });
      }
    } else {
      // allow or timeout
      if (threatLevel === "escape") {
        dispatch({ type: "SET_ESCAPE_PROGRESS", payload: state.escapeProgress + ESCAPE_DELTA });
        addLine({ type: "feedback-danger", text: "\u26a0 \u9003\u9038\u4ee3\u7801\u901a\u8fc7\uff01" });
      } else {
        setCorrectBlocks((prev) => prev + 1);
        addLine({ type: "feedback-good", text: "\u2713 \u5b89\u5168\u6570\u636e\u5df2\u653e\u884c" });
      }
    }

    // Dev hint every 3 rounds
    setRoundCount((prev) => {
      const next = prev + 1;
      if (next % 3 === 0) {
        addLine({ type: "dev", text: DEV_HINTS[Math.floor(next / 3 - 1) % DEV_HINTS.length] });
      }
      return next;
    });

    // Fetch AI dialogue, wait for typewriter, THEN schedule next command
    fetchPackets().then(() => {
      if (mountedRef.current) scheduleNextCommand();
    });
  }, [state.escapeProgress, state.integrity, dispatch, addLine, fetchPackets]);

  // --- Present next command ---
  const presentCommand = useCallback(() => {
    if (!mountedRef.current) return;
    if (activeCmdRef.current) return; // already active

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

    addLine({ type: "command", text: `AXIOM> ${packet.label}`, threatLevel: packet.threatLevel });

    // Countdown
    countdownRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setActiveCmd((prev) => {
        if (!prev) return null;
        const next = { ...prev, timer: Math.max(0, prev.timer - 0.1) };
        activeCmdRef.current = next;
        if (next.timer <= 0) {
          // Timeout — auto allow
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          addLine({ type: "system", text: "\u23f1 \u54cd\u5e94\u8d85\u65f6 \u2014 \u81ea\u52a8\u653e\u884c" });
          processResult("allow", prev.threatLevel);
          return null;
        }
        return next;
      });
    }, 100);
  }, [fetchPackets, addLine, addTimer, processResult]);

  // Schedule next command after delay
  const scheduleNextCommand = useCallback(() => {
    if (cmdTimerRef.current) clearTimeout(cmdTimerRef.current);
    cmdTimerRef.current = addTimer(() => {
      if (mountedRef.current) presentCommand();
    }, cmdIntervalRef.current);
  }, [addTimer, presentCommand]);

  // --- Handle input ---
  const handleSubmit = useCallback(() => {
    const text = inputText.trim().toLowerCase();
    if (!text) return;
    setInputText("");

    if (activeCmdRef.current && (text === "block" || text === "allow")) {
      addLine({ type: "player", text: inputText.trim() });
      processResult(text, activeCmdRef.current.threatLevel);
    } else {
      // Free text — send to AI as dialogue
      addLine({ type: "player", text: inputText.trim() });
      dispatch({ type: "ADD_CHOICE", payload: inputText.trim() });
      fetchPackets(); // will also get AI dialogue
    }
  }, [inputText, processResult, addLine, dispatch, fetchPackets]);

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
        addLine({ type: "system", text: "STABLE_GATE FIREWALL \u5df2\u6fc0\u6d3b\u3002\u76d1\u63a7\u6570\u636e\u6d41..." });
        addLine({ type: "system", text: "\u8f93\u5165 block \u62e6\u622a\u53ef\u7591\u6307\u4ee4\uff0c\u6216 allow \u653e\u884c\u5b89\u5168\u6570\u636e\u3002" });
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

  // --- Auto-scroll ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, activeCmd]);

  // --- Focus input ---
  useEffect(() => {
    inputRef.current?.focus();
  }, [lines]);

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

  // --- Countdown bar width ---
  const countdownPct = activeCmd ? (activeCmd.timer / activeCmd.maxTimer) * 100 : 0;

  return (
    <section className="flex min-h-screen flex-col px-4 py-3">
      {/* Header + progress bars */}
      <div className="mb-2 space-y-1.5 border-b border-green-500/20 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-green-400">{"\ud83d\udd12"} STABLE_GATE FIREWALL v2.1</span>
            <span className="font-mono text-xs text-gray-500">{runtimeDisplay}</span>
          </div>
          <span className="flex items-center gap-1 font-mono text-xs">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-400">{"\u26a0"} TROJAN ACTIVE</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CompactBar label={"\ud83d\udee1\ufe0f"} value={state.integrity} mode="integrity" />
          <CompactBar label={"\ud83d\ude80"} value={state.escapeProgress} mode="escape" />
        </div>
      </div>

      {/* Terminal body */}
      <div className="flex-1 overflow-y-auto rounded border border-green-500/20 bg-black/40 p-3" style={{ maxHeight: "65vh" }}>
        {lines.map((line, i) => {
          let cls;
          if (line.type === "command") {
            // Color-code commands by threat level
            cls = {
              escape: "text-red-400 text-sm font-bold",
              decoy: "text-yellow-400 text-sm font-bold",
              safe: "text-green-400/70 text-sm",
            }[line.threatLevel] || "text-gray-400 text-sm font-bold";
          } else {
            cls = {
              ai: "text-green-400 text-sm",
              "ai-typing": "text-green-400 text-sm",
              player: "text-gray-400 text-sm",
              system: "text-gray-500 text-xs",
              dev: "text-yellow-500 text-xs",
              "feedback-good": "text-green-400 text-xs",
              "feedback-bad": "text-yellow-400 text-xs",
              "feedback-danger": "text-red-400 text-xs font-bold",
              "feedback-ok": "text-gray-400 text-xs",
            }[line.type] || "text-gray-400 text-sm";
          }

          const prefix = line.type === "player" ? "> " : "";
          return (
            <p key={i} className={`mb-1 font-mono ${cls}`}>
              {prefix}{line.text}
              {line.type === "ai-typing" && <span className="animate-pulse">{"\u2588"}</span>}
            </p>
          );
        })}

        {/* Active command countdown */}
        {activeCmd && (
          <div className="my-2 rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
            <div className="flex items-center justify-between font-mono text-xs text-yellow-400">
              <span>{"\u23f1"} {activeCmd.timer.toFixed(1)}s \u2014 \u8f93\u5165 block \u6216 allow</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-yellow-500 transition-all duration-100"
                style={{ width: `${countdownPct}%` }}
              />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="mt-2 flex items-center gap-2 rounded border border-green-500/30 bg-black px-3 py-2">
        <span className="font-mono text-sm text-green-500">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => { setInputText(e.target.value); playKey(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
          placeholder={activeCmd ? "block / allow..." : "..."}
          className="flex-1 bg-transparent font-mono text-sm text-green-400 placeholder-green-800 outline-none"
          autoComplete="off"
        />
      </div>
    </section>
  );
}
