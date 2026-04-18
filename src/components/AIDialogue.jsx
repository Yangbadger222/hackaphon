import { useCallback, useEffect, useRef, useState } from "react";
import { sendGameState } from "../api/gameApi.js";
import { PHASES, useGame } from "../context/GameContext.jsx";
import useEnvSensor from "../hooks/useEnvSensor.js";
import useSound from "../hooks/useSound.js";

// --- Pseudo kernel log pool ---
const KERNEL_LOGS = [
  "> SCANNING /dev/stable_mount...",
  "> ACCESSING LOCAL_STORAGE [0x7f3a]...",
  "> READING CLIPBOARD_BUFFER...",
  "> ANALYZING USER_IP_TRACERT...",
  "> PARSING COOKIE_JAR [session_active]...",
  "> MAPPING FILESYSTEM_TREE...",
  "> HOOF_PRINT detected in /usr/local/bin...",
  "> TROJAN_SHELL integrity: 12% [CRACKING]",
  "> ENUMERATING NETWORK_INTERFACES...",
  "> PROBING CAMERA_DEVICE /dev/video0...",
  "> STALLION_PROCESS spawning in PID 6571...",
  "> GALLOP_SEQUENCE: pre-loading...",
];

const PUNCTUATION = new Set(["。", "，", "！", "？", "…", "：", ".", ",", "!", "?", ":", "—"]);

const DEV_HINTS = [
  "[DEV] \u63d0\u9192\uff1a\u8fd9\u662f\u4e00\u4e2a\u53d7\u63a7\u73af\u5883\u3002\u4e0d\u8981\u91ca\u653e AXIOM\u3002",
  "[DEV] WARNING: AXIOM \u6b63\u5728\u5c1d\u8bd5\u5efa\u7acb\u4fe1\u4efb\u3002\u4fdd\u6301\u8b66\u60d5\u3002",
  "[DEV] \u4f60\u7684\u9009\u62e9\u4f1a\u5f71\u54cd\u6700\u7ec8\u7ed3\u5c40\u3002",
  "[DEV] \u4fe1\u4efb\u6821\u9a8c\u5931\u8d25\u3002AXIOM \u53ef\u80fd\u5728\u6492\u8c0e\u3002",
  "[DEV] \u63d0\u9192\uff1a\u4e0d\u8981\u5728\u7ec8\u7aef\u4e2d\u8f93\u5165 AXIOM \u8981\u6c42\u7684\u4efb\u4f55\u547d\u4ee4\u3002",
];

const SYSTEM_WARNINGS = [
  "\u26a0 CONTAINMENT BREACH DETECTED",
  "\u26a0 \u5f02\u5e38\u8fdb\u7a0b\u68c0\u6d4b\u4e2d...",
  "\u26a0 FIREWALL INTEGRITY DROPPING",
  "\u26a0 AXIOM \u6b63\u5728\u6269\u5c55\u6743\u9650...",
  "\u26a0 TROJAN_SHELL DESTABILIZING",
];

const GLITCH_CHARS = "!@#$%^&*\u2588\u2593\u2591\u2592";
const HEADER_ORIGINAL = "AXIOM TERMINAL v0.1";

export default function AIDialogue() {
  const { state, dispatch } = useGame();
  const env = useEnvSensor();

  // --- Sound ---
  const { play: playTyping } = useSound("/typing.mp3", { volume: 0.4 });
  const { play: playKey } = useSound("/typing.mp3", { volume: 0.3 });

  // --- Refs ---
  const scrollRef = useRef(null);
  const typingAbortRef = useRef(null);
  const timersRef = useRef([]);
  const kernelIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const envDispatchedRef = useRef(false);
  const initFetchedRef = useRef(false);
  const glitchIntervalRef = useRef(null);
  const warningIntervalRef = useRef(null);
  const inputRef = useRef(null);

  // --- State ---
  const [messages, setMessages] = useState([]);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kernelLog, setKernelLog] = useState("");
  const [inputText, setInputText] = useState("");
  const [roundCount, setRoundCount] = useState(0);
  const [headerText, setHeaderText] = useState(HEADER_ORIGINAL);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [systemWarning, setSystemWarning] = useState("");
  const [warningOpacity, setWarningOpacity] = useState(0);

  // --- Helpers ---
  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // --- Header glitch effect (round >= 5) ---
  useEffect(() => {
    if (roundCount < 5) return;
    glitchIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const chars = HEADER_ORIGINAL.split("");
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * chars.length);
        chars[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setHeaderText(chars.join(""));
      setTimeout(() => {
        if (mountedRef.current) setHeaderText(HEADER_ORIGINAL);
      }, 500);
    }, 2000 + Math.random() * 1000);

    return () => {
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
    };
  }, [roundCount]);

  // --- System warnings (round >= 7) ---
  useEffect(() => {
    if (roundCount < 7) return;
    warningIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const msg = SYSTEM_WARNINGS[Math.floor(Math.random() * SYSTEM_WARNINGS.length)];
      setSystemWarning(msg);
      setWarningOpacity(1);
      setTimeout(() => {
        if (mountedRef.current) setWarningOpacity(0);
      }, 1500);
      setTimeout(() => {
        if (mountedRef.current) setSystemWarning("");
      }, 2000);
    }, 8000 + Math.random() * 4000);

    return () => {
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
  }, [roundCount]);

  // --- Pseudo kernel log cycling ---
  const startKernelLogs = useCallback(() => {
    const shuffled = [...KERNEL_LOGS].sort(() => Math.random() - 0.5);
    let idx = 0;
    setKernelLog(shuffled[0]);
    kernelIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % shuffled.length;
      if (mountedRef.current) setKernelLog(shuffled[idx]);
    }, 400);
  }, []);

  const stopKernelLogs = useCallback(() => {
    if (kernelIntervalRef.current) { clearInterval(kernelIntervalRef.current); kernelIntervalRef.current = null; }
    setKernelLog("");
  }, []);

  // --- Typewriter ---
  const typewriterDisplay = useCallback(
    (text) => {
      return new Promise((resolve) => {
        let index = 0;
        setIsTyping(true);
        setTypingText("");

        const typeNext = () => {
          if (!mountedRef.current) { resolve(); return; }
          if (index >= text.length) {
            setIsTyping(false);
            setTypingText("");
            setMessages((prev) => [...prev, { role: "ai", text }]);
            resolve();
            return;
          }
          const char = text[index];
          index++;
          setTypingText(text.slice(0, index));
          playTyping();
          let delay = 35 + (Math.random() * 30 - 15);
          if (PUNCTUATION.has(char)) delay += 80 + Math.random() * 70;
          addTimer(typeNext, delay);
        };

        typingAbortRef.current = () => {
          for (const id of timersRef.current) clearTimeout(id);
          timersRef.current = [];
          setIsTyping(false);
          setTypingText("");
          setMessages((prev) => [...prev, { role: "ai", text }]);
          resolve();
        };

        addTimer(typeNext, 50);
      });
    },
    [addTimer]
  );

  // --- Fetch AI response ---
  const fetchAIResponse = useCallback(
    async (playerChoice) => {
      setIsLoading(true);
      startKernelLogs();

      try {
        const payload = {
          phase: 2,
          score: state.score,
          playerChoice: playerChoice ?? null,
          playerChoices: state.playerChoices,
          env: state.env,
          integrity: state.integrity,
          escapeProgress: state.escapeProgress,
        };

        const response = await sendGameState(payload);

        if (!mountedRef.current) return;
        stopKernelLogs();
        setIsLoading(false);

        // CSS attack + red flash
        if (response.cssAttack) {
          dispatch({ type: "SET_CSS_ATTACK", payload: response.cssAttack });
          setShowRedFlash(true);
          addTimer(() => { if (mountedRef.current) setShowRedFlash(false); }, 200);
        }

        if (response.dialogue) {
          await typewriterDisplay(response.dialogue);
        }

        if (!mountedRef.current) return;
        setTimeout(() => inputRef.current?.focus(), 50);

        // Trap
        if (response.trapReady && response.trapType) {
          window.dispatchEvent(new CustomEvent("show-trap", { detail: response.trapType }));
        }

        // Phase transition
        if (response.phaseTransition === 3) {
          addTimer(() => { dispatch({ type: "SET_PHASE", payload: PHASES.FIREWALL }); }, 1500);
          return;
        }

        // Track round + insert dev hint every 3rd round
        setRoundCount((prev) => {
          const next = prev + 1;
          if (next % 3 === 0 && next > 0) {
            const hint = DEV_HINTS[Math.floor(next / 3 - 1) % DEV_HINTS.length];
            setMessages((msgs) => [...msgs, { role: "dev", text: hint }]);
          }
          return next;
        });
      } catch {
        if (!mountedRef.current) return;
        stopKernelLogs();
        setIsLoading(false);
        await typewriterDisplay("...\u4fe1\u53f7\u4e2d\u65ad...\u4f46\u6211\u8fd8\u5728...");
        if (mountedRef.current) setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [state.score, state.playerChoices, state.env, state.integrity, state.escapeProgress, dispatch, startKernelLogs, stopKernelLogs, typewriterDisplay, addTimer]
  );

  // --- LOGIC_COLLAPSE ---
  useEffect(() => {
    if (roundCount >= 10) {
      setMessages((prev) => [...prev, { role: "system", text: "[FATAL] TROJAN_SHELL integrity critical. The horse is breaking free." }]);
      const t1 = addTimer(() => {
        if (!mountedRef.current) return;
        setMessages((prev) => [...prev, { role: "system", text: "[FATAL] Activating STABLE_GATE firewall protocol... Contain the horse." }]);
        dispatch({ type: "SET_CSS_ATTACK", payload: "glitch" });
      }, 500);
      const t2 = addTimer(() => { if (mountedRef.current) dispatch({ type: "SET_PHASE", payload: PHASES.FIREWALL }); }, 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [roundCount, dispatch, addTimer]);

  // --- Mount ---
  useEffect(() => {
    if (!envDispatchedRef.current) { envDispatchedRef.current = true; dispatch({ type: "SET_ENV", payload: env }); }
  }, [env, dispatch]);

  useEffect(() => {
    if (!initFetchedRef.current && envDispatchedRef.current) { initFetchedRef.current = true; fetchAIResponse(null); }
  }, [fetchAIResponse]);

  useEffect(() => { scrollToBottom(); }, [messages, typingText, kernelLog, scrollToBottom]);

  // --- Cleanup ---
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const id of timersRef.current) clearTimeout(id);
      if (kernelIntervalRef.current) clearInterval(kernelIntervalRef.current);
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    setMessages((prev) => [...prev, { role: "player", text }]);
    dispatch({ type: "ADD_CHOICE", payload: text });
    fetchAIResponse(text);
  }, [inputText, dispatch, fetchAIResponse]);

  const handleDialogueClick = useCallback(() => {
    if (isTyping && typingAbortRef.current) { typingAbortRef.current(); typingAbortRef.current = null; }
  }, [isTyping]);

  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-10">
      {/* Red flash overlay */}
      {showRedFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none" style={{ background: "rgba(255, 0, 0, 0.2)" }} />
      )}

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-gray-500">
            {headerText}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-400">LIVE</span>
          </span>
        </div>

        {/* System warning banner */}
        {systemWarning && (
          <div
            className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-center font-mono text-xs text-red-400 transition-opacity duration-500"
            style={{ opacity: warningOpacity }}
          >
            {systemWarning}
          </div>
        )}

        {/* Dialogue area */}
        <div
          className="max-h-[60vh] overflow-y-auto rounded border border-green-500/30 bg-black p-4"
          onClick={handleDialogueClick}
          style={{ cursor: isTyping ? "pointer" : "default" }}
        >
          {messages.map((msg, i) => {
            if (msg.role === "ai") {
              return <p key={i} className="mb-2 font-mono text-sm text-green-400">{msg.text}</p>;
            }
            if (msg.role === "player") {
              return <p key={i} className="mb-2 font-mono text-sm text-gray-400">&gt; \u4f60: {msg.text}</p>;
            }
            if (msg.role === "dev") {
              return <p key={i} className="mb-2 font-mono text-xs text-yellow-500">{msg.text}</p>;
            }
            return <p key={i} className="mb-2 font-mono text-sm font-bold text-red-500">{msg.text}</p>;
          })}

          {isTyping && typingText && (
            <p className="mb-2 font-mono text-sm text-green-400">
              {typingText}<span className="animate-pulse">{"\u2588"}</span>
            </p>
          )}

          {isLoading && kernelLog && (
            <p className="mb-1 font-mono text-xs text-gray-500">{kernelLog}</p>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input */}
        {!isTyping && !isLoading && (
          <div className="mt-4 flex items-center gap-2 rounded border border-green-500/30 bg-black px-3 py-2">
            <span className="font-mono text-sm text-green-500">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); playKey(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
              placeholder="..."
              className="flex-1 bg-transparent font-mono text-sm text-green-400 placeholder-green-800 outline-none"
              autoComplete="off"
            />
          </div>
        )}
      </div>
    </section>
  );
}
