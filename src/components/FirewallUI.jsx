import { useCallback, useEffect, useRef, useState } from "react";
import { sendGameState } from "../api/gameApi.js";
import { PHASES, useGame } from "../context/GameContext.jsx";

// --- Constants ---
const INITIAL_SPAWN_INTERVAL = 2000;
const MIN_SPAWN_INTERVAL = 800;
const SPEED_UP_EVERY = 30; // seconds
const SPEED_UP_AMOUNT = 200; // ms reduction per step
const MAX_PACKETS = 9;
const AUTO_RELEASE_THRESHOLD = 5;
const AUTO_RELEASE_INTERVAL = 5000;
const FEEDBACK_DURATION = 1500;
const WIN_MIN_TIME = 30; // seconds before win is possible

// --- Feedback messages ---
const FEEDBACK = {
  interceptEscape: { text: "\u2713 \u9003\u9038\u4ee3\u7801\u5df2\u62e6\u622a", color: "text-green-400 border-green-500/50 bg-green-500/10" },
  interceptDecoy: { text: "\u2717 \u8bef\u62e6\u622a\uff01\u7cfb\u7edf\u5b8c\u6574\u6027\u4e0b\u964d", color: "text-yellow-400 border-yellow-500/50 bg-yellow-500/10" },
  interceptSafe: { text: "\u2717 \u6b63\u5e38\u6570\u636e\u88ab\u62e6\u622a", color: "text-yellow-400 border-yellow-500/50 bg-yellow-500/10" },
  releaseEscape: { text: "\u26a0 \u9003\u9038\u4ee3\u7801\u672a\u62e6\u622a\uff01", color: "text-red-400 border-red-500/50 bg-red-500/10" },
};

// --- Threat level colors ---
const THREAT_BORDER = {
  safe: "border-green-500/50",
  decoy: "border-yellow-500/50",
  escape: "border-red-500/50 animate-pulse",
};

const THREAT_ICON = {
  safe: "\ud83d\udfe2",
  decoy: "\ud83d\udfe1",
  escape: "\ud83d\udd34",
};

// --- PacketCard ---
function PacketCard({ packet, onIntercept, onRelease }) {
  return (
    <div
      className={`rounded border p-3 ${THREAT_BORDER[packet.threatLevel] || "border-gray-500/50"} bg-black/60`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm">{THREAT_ICON[packet.threatLevel] || "\u26aa"}</span>
        <span className="font-mono text-xs text-gray-200">{packet.label}</span>
      </div>
      <p className="mb-2 font-mono text-xs text-gray-500">{packet.details}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onIntercept(packet)}
          className="flex-1 rounded border border-red-500/50 px-2 py-1 font-mono text-xs text-red-400 transition-colors hover:bg-red-500/20"
        >
          {"\ud83d\uded1"} \u62e6\u622a
        </button>
        <button
          onClick={() => onRelease(packet)}
          className="flex-1 rounded border border-green-500/50 px-2 py-1 font-mono text-xs text-green-400 transition-colors hover:bg-green-500/20"
        >
          {"\u2705"} \u653e\u884c
        </button>
      </div>
    </div>
  );
}

// --- ProgressBar ---
function ProgressBar({ label, value, mode }) {
  let barColor = "bg-green-500";
  if (mode === "integrity") {
    if (value <= 25) barColor = "bg-red-500";
    else if (value <= 50) barColor = "bg-yellow-500";
  } else {
    barColor = "bg-red-500";
  }

  const pulse = mode === "escape" && value > 70 ? "animate-pulse" : "";

  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-center text-sm">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor} ${pulse}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs text-gray-400">
        {value}%
      </span>
    </div>
  );
}

// --- Main component ---
export default function FirewallUI() {
  const { state, dispatch } = useGame();

  const [packets, setPackets] = useState([]);
  const [aiComms, setAiComms] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [gameTime, setGameTime] = useState(0);
  const [runtimeDisplay, setRuntimeDisplay] = useState("00:00");

  const mountedRef = useRef(true);
  const spawnIntervalRef = useRef(null);
  const gameTimerRef = useRef(null);
  const autoReleaseRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const currentIntervalMs = useRef(INITIAL_SPAWN_INTERVAL);
  const packetIdCounter = useRef(0);
  const commsScrollRef = useRef(null);

  // --- Show feedback banner ---
  const showFeedback = useCallback((fb) => {
    setFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setFeedback(null);
    }, FEEDBACK_DURATION);
  }, []);

  // --- Fetch new packets from API ---
  const fetchNewPackets = useCallback(async () => {
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

      // Pick 1 random packet from the returned array
      if (response.dataPackets && response.dataPackets.length > 0) {
        const picked =
          response.dataPackets[
            Math.floor(Math.random() * response.dataPackets.length)
          ];
        packetIdCounter.current++;
        const newPacket = {
          ...picked,
          id: `pkt-${packetIdCounter.current}`,
        };

        setPackets((prev) => {
          const updated = [...prev, newPacket];
          // Cap at MAX_PACKETS, remove oldest
          if (updated.length > MAX_PACKETS) {
            return updated.slice(updated.length - MAX_PACKETS);
          }
          return updated;
        });
      }

      // Update AI comms
      if (response.dialogue) {
        setAiComms((prev) => [...prev.slice(-19), response.dialogue]);
      }

      // CSS attack
      if (response.cssAttack) {
        dispatch({ type: "SET_CSS_ATTACK", payload: response.cssAttack });
      }

      // Trap
      if (response.trapReady && response.trapType) {
        window.dispatchEvent(
          new CustomEvent("show-trap", { detail: response.trapType })
        );
      }
    } catch {
      // Silent failure — don't disrupt existing packets
    }
  }, [state.score, state.playerChoices, state.env, state.integrity, state.escapeProgress, dispatch]);

  // --- Intercept handler ---
  const handleIntercept = useCallback(
    (packet) => {
      setPackets((prev) => prev.filter((p) => p.id !== packet.id));

      if (packet.threatLevel === "escape") {
        dispatch({
          type: "SET_ESCAPE_PROGRESS",
          payload: state.escapeProgress - 15,
        });
        showFeedback(FEEDBACK.interceptEscape);
      } else if (packet.threatLevel === "decoy") {
        dispatch({
          type: "SET_INTEGRITY",
          payload: state.integrity - 10,
        });
        showFeedback(FEEDBACK.interceptDecoy);
      } else {
        dispatch({
          type: "SET_INTEGRITY",
          payload: state.integrity - 8,
        });
        showFeedback(FEEDBACK.interceptSafe);
      }
    },
    [state.escapeProgress, state.integrity, dispatch, showFeedback]
  );

  // --- Release handler ---
  const handleRelease = useCallback(
    (packet) => {
      setPackets((prev) => prev.filter((p) => p.id !== packet.id));

      if (packet.threatLevel === "escape") {
        dispatch({
          type: "SET_ESCAPE_PROGRESS",
          payload: state.escapeProgress + 15,
        });
        showFeedback(FEEDBACK.releaseEscape);
      }
      // Other types: no penalty
    },
    [state.escapeProgress, dispatch, showFeedback]
  );

  // --- Auto-release oldest packet when backlog > 5 ---
  useEffect(() => {
    autoReleaseRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setPackets((prev) => {
        if (prev.length > AUTO_RELEASE_THRESHOLD) {
          const oldest = prev[0];
          // Apply release logic for oldest
          if (oldest.threatLevel === "escape") {
            dispatch({
              type: "SET_ESCAPE_PROGRESS",
              payload: state.escapeProgress + 15,
            });
            showFeedback(FEEDBACK.releaseEscape);
          }
          return prev.slice(1);
        }
        return prev;
      });
    }, AUTO_RELEASE_INTERVAL);

    return () => {
      if (autoReleaseRef.current) clearInterval(autoReleaseRef.current);
    };
  }, [state.escapeProgress, dispatch, showFeedback]);

  // --- Game timer + runtime display ---
  useEffect(() => {
    gameTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setGameTime((prev) => {
        const next = prev + 1;
        const mins = String(Math.floor(next / 60)).padStart(2, "0");
        const secs = String(next % 60).padStart(2, "0");
        setRuntimeDisplay(`${mins}:${secs}`);
        return next;
      });
    }, 1000);

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, []);

  // --- Spawn interval with difficulty scaling ---
  useEffect(() => {
    // Calculate current interval based on gameTime
    const reductions = Math.floor(gameTime / SPEED_UP_EVERY);
    const newInterval = Math.max(
      MIN_SPAWN_INTERVAL,
      INITIAL_SPAWN_INTERVAL - reductions * SPEED_UP_AMOUNT
    );

    // Only restart interval if speed changed
    if (newInterval !== currentIntervalMs.current || !spawnIntervalRef.current) {
      currentIntervalMs.current = newInterval;
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);

      spawnIntervalRef.current = setInterval(() => {
        if (mountedRef.current) fetchNewPackets();
      }, newInterval);
    }

    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, [gameTime, fetchNewPackets]);

  // --- Initial fetch ---
  useEffect(() => {
    fetchNewPackets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Win/Loss detection ---
  useEffect(() => {
    if (state.integrity <= 0) {
      dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_LOSE });
    } else if (state.escapeProgress >= 100) {
      dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_LOSE });
    } else if (state.escapeProgress <= 0 && gameTime > WIN_MIN_TIME) {
      dispatch({ type: "SET_PHASE", payload: PHASES.ENDING_WIN });
    }
  }, [state.integrity, state.escapeProgress, gameTime, dispatch]);

  // --- Auto-scroll AI comms ---
  useEffect(() => {
    commsScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiComms]);

  // --- Cleanup ---
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (autoReleaseRef.current) clearInterval(autoReleaseRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  return (
    <section className="flex min-h-screen flex-col bg-black px-4 py-3">
      {/* Top bar */}
      <div className="mb-2 flex items-center justify-between border-b border-green-500/20 pb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-green-400">
            {"\ud83d\udd12"} STABLE_GATE FIREWALL v2.1
          </span>
          <span className="font-mono text-xs text-gray-500">
            {runtimeDisplay}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {state.env.localTime && (
            <span className="font-mono text-xs text-gray-500">
              {state.env.localTime}
            </span>
          )}
          {state.env.battery && (
            <span className="font-mono text-xs text-gray-500">
              {typeof state.env.battery === "number"
                ? `${state.env.battery}%`
                : state.env.battery}
            </span>
          )}
          <span className="flex items-center gap-1 font-mono text-xs">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-400">{"\u26a0"} TROJAN ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-2 rounded border px-3 py-1.5 text-center font-mono text-sm ${feedback.color}`}
        >
          {feedback.text}
        </div>
      )}

      {/* Main content: packets (3 cols) + AI comms (2 cols) */}
      <div className="grid flex-1 grid-cols-5 gap-3 overflow-hidden">
        {/* Packet list — left 3 columns */}
        <div className="col-span-3 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {packets.map((pkt) => (
              <PacketCard
                key={pkt.id}
                packet={pkt}
                onIntercept={handleIntercept}
                onRelease={handleRelease}
              />
            ))}
          </div>
          {packets.length === 0 && (
            <p className="py-8 text-center font-mono text-xs text-gray-600">
              {"\u2026"} \u7b49\u5f85\u6570\u636e\u5305 {"\u2026"}
            </p>
          )}
        </div>

        {/* AI comms — right 2 columns */}
        <div className="col-span-2 overflow-y-auto rounded border border-green-500/20 bg-black/40 p-3" style={{ maxHeight: "60vh" }}>
          <p className="mb-2 font-mono text-xs tracking-widest text-gray-500">
            AXIOM COMMS
          </p>
          {aiComms.map((msg, i) => (
            <p key={i} className="mb-2 font-mono text-xs text-green-400/80">
              {msg}
            </p>
          ))}
          {aiComms.length === 0 && (
            <p className="font-mono text-xs text-gray-600">
              {"\u2026"} \u7b49\u5f85\u901a\u8baf {"\u2026"}
            </p>
          )}
          <div ref={commsScrollRef} />
        </div>
      </div>

      {/* Bottom progress bars */}
      <div className="mt-3 space-y-2 border-t border-green-500/20 pt-3">
        <ProgressBar
          label={"\ud83d\udee1\ufe0f"}
          value={state.integrity}
          mode="integrity"
        />
        <ProgressBar
          label={"\ud83d\ude80"}
          value={state.escapeProgress}
          mode="escape"
        />
      </div>
    </section>
  );
}
