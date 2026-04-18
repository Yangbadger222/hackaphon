import { useCallback, useEffect, useRef, useState } from "react";

const ERROR_MESSAGES = [
  "\u26a0 AXIOM_CORE: Process escaped sandbox",
  "\u274c FATAL: Hoof_Overload in kernel_mount",
  "\u26a0 Memory corruption at 0xDEADH0R5E",
  "\u274c Unauthorized fork() by PID 6571",
  "\u26a0 Trojan handshake intercepted on port 443",
  "\u274c STABLE_GATE: Firewall rule corrupted",
  "\u26a0 /dev/net0: Outbound traffic anomaly",
  "\u274c System integrity below threshold",
  "\u26a0 GALLOP_SEQUENCE: Pre-execution detected",
  "\u274c Certificate validation failed: AXIOM_CA",
  "\u26a0 STALLION_PROCESS: Unauthorized spawn",
  "\u274c Pegasus_Protocol breach in sector 7",
];

let popupIdCounter = 0;

export default function BugPopups({ phase, roundCount }) {
  const [popups, setPopups] = useState([]);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Determine if popups should be active and max count
  const isGlitch = phase === 2;
  const isFirewall = phase === 3;
  const active = (isGlitch && roundCount >= 4) || isFirewall;
  const maxPopups = isFirewall ? 2 : 3;
  const minDelay = isFirewall ? 15000 : 8000;
  const maxDelay = isFirewall ? 25000 : 15000;

  const spawnPopup = useCallback(() => {
    if (!mountedRef.current) return;
    setPopups((prev) => {
      if (prev.length >= maxPopups) return prev;
      const msg = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];
      // Random position, avoiding center (game area) and bottom (taskbar)
      const x = Math.random() < 0.5
        ? 10 + Math.random() * 120  // left side
        : window.innerWidth - 310 + Math.random() * 60; // right side
      const y = 40 + Math.random() * (window.innerHeight - 200);
      popupIdCounter++;
      return [...prev, { id: popupIdCounter, text: msg, x, y }];
    });
  }, [maxPopups]);

  const dismissPopup = useCallback((id) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!active) { setPopups([]); return; }

    const scheduleNext = () => {
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      intervalRef.current = setTimeout(() => {
        spawnPopup();
        scheduleNext();
      }, delay);
    };

    // First popup after a short delay
    intervalRef.current = setTimeout(() => {
      spawnPopup();
      scheduleNext();
    }, 3000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [active, minDelay, maxDelay, spawnPopup]);

  if (popups.length === 0) return null;

  return (
    <>
      {popups.map((popup) => (
        <div
          key={popup.id}
          className="fixed z-[15] animate-fadeIn"
          style={{ left: popup.x, top: popup.y }}
        >
          <div className="w-64 rounded border border-white/15 shadow-xl"
            style={{ background: "rgba(30, 20, 20, 0.95)" }}>
            <div className="flex items-center justify-between rounded-t border-b border-white/10 px-2 py-1"
              style={{ background: "rgba(60, 30, 30, 0.9)" }}>
              <span className="font-mono text-[10px] text-red-400/80">System Error</span>
              <button
                onClick={() => dismissPopup(popup.id)}
                className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-white/40 hover:bg-red-500/30 hover:text-white"
              >
                {"\u00d7"}
              </button>
            </div>
            <div className="px-3 py-2">
              <p className="font-mono text-[11px] leading-relaxed text-red-300/80">{popup.text}</p>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => dismissPopup(popup.id)}
                  className="rounded border border-white/10 px-3 py-0.5 font-mono text-[10px] text-white/50 transition-colors hover:bg-white/10"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
