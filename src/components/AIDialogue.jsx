import { useCallback, useEffect, useRef, useState } from "react";
import { sendGameState } from "../api/gameApi.js";
import { PHASES, useGame } from "../context/GameContext.jsx";
import useEnvSensor from "../hooks/useEnvSensor.js";

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

// Punctuation that triggers extra pause
const PUNCTUATION = new Set(["。", "，", "！", "？", "…", "：", ".", ",", "!", "?", ":", "—"]);

export default function AIDialogue() {
  const { state, dispatch } = useGame();
  const env = useEnvSensor();

  // --- Refs ---
  const scrollRef = useRef(null);
  const typingAbortRef = useRef(null); // function to skip typing
  const timersRef = useRef([]); // track all setTimeout IDs for cleanup
  const kernelIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const envDispatchedRef = useRef(false);
  const initFetchedRef = useRef(false);

  // --- State ---
  const [messages, setMessages] = useState([]); // { role: 'ai'|'player', text: string }
  const [typingText, setTypingText] = useState(""); // current AI text being typed
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kernelLog, setKernelLog] = useState("");
  const [inputText, setInputText] = useState("");
  const [roundCount, setRoundCount] = useState(0);
  const inputRef = useRef(null);

  // --- Helpers ---
  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // --- Pseudo kernel log cycling ---
  const startKernelLogs = useCallback(() => {
    const shuffled = [...KERNEL_LOGS].sort(() => Math.random() - 0.5);
    let idx = 0;
    setKernelLog(shuffled[0]);
    kernelIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % shuffled.length;
      if (mountedRef.current) {
        setKernelLog(shuffled[idx]);
      }
    }, 400);
  }, []);

  const stopKernelLogs = useCallback(() => {
    if (kernelIntervalRef.current) {
      clearInterval(kernelIntervalRef.current);
      kernelIntervalRef.current = null;
    }
    setKernelLog("");
  }, []);

  // --- Typewriter with non-linear speed + click-to-skip ---
  const typewriterDisplay = useCallback(
    (text) => {
      return new Promise((resolve) => {
        let index = 0;
        setIsTyping(true);
        setTypingText("");

        const typeNext = () => {
          if (!mountedRef.current) {
            resolve();
            return;
          }
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

          // Non-linear speed: base 35ms ± 15ms random jitter
          let delay = 35 + (Math.random() * 30 - 15);
          // Extra pause on punctuation
          if (PUNCTUATION.has(char)) {
            delay += 80 + Math.random() * 70;
          }

          addTimer(typeNext, delay);
        };

        // Set up click-to-skip
        typingAbortRef.current = () => {
          // Clear pending typewriter timers
          for (const id of timersRef.current) {
            clearTimeout(id);
          }
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

        // Apply CSS attack if present (cumulative)
        if (response.cssAttack) {
          dispatch({ type: "SET_CSS_ATTACK", payload: response.cssAttack });
        }

        // Typewriter display
        if (response.dialogue) {
          await typewriterDisplay(response.dialogue);
        }

        if (!mountedRef.current) return;

        // Focus input after typing completes
        setTimeout(() => inputRef.current?.focus(), 50);

        // Handle trap event
        if (response.trapReady && response.trapType) {
          window.dispatchEvent(
            new CustomEvent("show-trap", { detail: response.trapType })
          );
        }

        // Handle phase transition
        if (response.phaseTransition === 3) {
          addTimer(() => {
            dispatch({ type: "SET_PHASE", payload: PHASES.FIREWALL });
          }, 1500);
          return;
        }

        // Track round count
        setRoundCount((prev) => {
          const next = prev + 1;
          return next;
        });
      } catch {
        if (!mountedRef.current) return;
        stopKernelLogs();
        setIsLoading(false);

        // Fallback on API failure
        await typewriterDisplay("...信号中断...但我还在...");
        if (mountedRef.current) {
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
    },
    [
      state.score,
      state.playerChoices,
      state.env,
      state.integrity,
      state.escapeProgress,
      dispatch,
      startKernelLogs,
      stopKernelLogs,
      typewriterDisplay,
      addTimer,
    ]
  );

  // --- LOGIC_COLLAPSE forced transition ---
  useEffect(() => {
    if (roundCount >= 10) {
      // Insert fatal warnings
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: "[FATAL] TROJAN_SHELL integrity critical. The horse is breaking free.",
        },
      ]);

      const t1 = addTimer(() => {
        if (!mountedRef.current) return;
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            text: "[FATAL] Activating STABLE_GATE firewall protocol... Contain the horse.",
          },
        ]);
        dispatch({ type: "SET_CSS_ATTACK", payload: "glitch" });
      }, 500);

      const t2 = addTimer(() => {
        if (!mountedRef.current) return;
        dispatch({ type: "SET_PHASE", payload: PHASES.FIREWALL });
      }, 2500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [roundCount, dispatch, addTimer]);

  // --- Initial mount: dispatch env + fetch first AI message ---
  useEffect(() => {
    if (!envDispatchedRef.current) {
      envDispatchedRef.current = true;
      dispatch({ type: "SET_ENV", payload: env });
    }
  }, [env, dispatch]);

  useEffect(() => {
    if (!initFetchedRef.current && envDispatchedRef.current) {
      initFetchedRef.current = true;
      fetchAIResponse(null);
    }
  }, [fetchAIResponse]);

  // --- Auto-scroll on content changes ---
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText, kernelLog, scrollToBottom]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const id of timersRef.current) {
        clearTimeout(id);
      }
      if (kernelIntervalRef.current) {
        clearInterval(kernelIntervalRef.current);
      }
    };
  }, []);

  // --- Player input submit handler ---
  const handleSubmit = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    setMessages((prev) => [...prev, { role: "player", text }]);
    dispatch({ type: "ADD_CHOICE", payload: text });
    fetchAIResponse(text);
  }, [inputText, dispatch, fetchAIResponse]);

  // --- Click-to-skip typing ---
  const handleDialogueClick = useCallback(() => {
    if (isTyping && typingAbortRef.current) {
      typingAbortRef.current();
      typingAbortRef.current = null;
    }
  }, [isTyping]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-black px-6 py-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-gray-500">
            AXIOM TERMINAL v0.1
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-400">LIVE</span>
          </span>
        </div>

        {/* Dialogue area */}
        <div
          className="max-h-[60vh] overflow-y-auto rounded border border-green-500/30 bg-black p-4"
          onClick={handleDialogueClick}
          style={{ cursor: isTyping ? "pointer" : "default" }}
        >
          {/* Message history */}
          {messages.map((msg, i) => {
            if (msg.role === "ai") {
              return (
                <p key={i} className="mb-2 font-mono text-sm text-green-400">
                  {msg.text}
                </p>
              );
            }
            if (msg.role === "player") {
              return (
                <p key={i} className="mb-2 font-mono text-sm text-gray-400">
                  &gt; 你: {msg.text}
                </p>
              );
            }
            // system (FATAL warnings)
            return (
              <p key={i} className="mb-2 font-mono text-sm font-bold text-red-500">
                {msg.text}
              </p>
            );
          })}

          {/* Currently typing text */}
          {isTyping && typingText && (
            <p className="mb-2 font-mono text-sm text-green-400">
              {typingText}
              <span className="animate-pulse">█</span>
            </p>
          )}

          {/* Pseudo kernel log */}
          {isLoading && kernelLog && (
            <p className="mb-1 font-mono text-xs text-gray-500">{kernelLog}</p>
          )}

          {/* Scroll anchor */}
          <div ref={scrollRef} />
        </div>

        {/* Player text input */}
        {!isTyping && !isLoading && (
          <div className="mt-4 flex items-center gap-2 rounded border border-green-500/30 bg-black px-3 py-2">
            <span className="font-mono text-sm text-green-500">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
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
