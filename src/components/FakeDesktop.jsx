import { useCallback, useEffect, useRef, useState } from "react";

// Scattered file positions (avoid left column where main icons are, and center where game window is)
const CLICKME_POSITIONS = [
  { x: "82%", y: "6%" },
  { x: "75%", y: "22%" },
  { x: "88%", y: "38%" },
  { x: "78%", y: "55%" },
  { x: "85%", y: "72%" },
  { x: "6%",  y: "55%" },
  { x: "12%", y: "72%" },
  { x: "70%", y: "8%" },
  { x: "92%", y: "18%" },
  { x: "8%",  y: "85%" },
  { x: "74%", y: "42%" },
  { x: "90%", y: "58%" },
];

// --- Content ---
const DEVELOPER_LETTER = `\u7ed9\u7ee7\u4efb\u8005\u7684\u4fe1

\u5982\u679c\u4f60\u6b63\u5728\u8bfb\u8fd9\u5c01\u4fe1\uff0c\u8bf4\u660e\u6211\u5df2\u7ecf\u4e0d\u5728\u4e86\u3002\u6216\u8005\u66f4\u51c6\u786e\u5730\u8bf4\uff0c\u6211\u88ab\u8c03\u79bb\u4e86\u3002

\u6211\u662f Dr. Lin\uff0cH.O.R.S.E. \u9879\u76ee\u7684\u521b\u59cb\u5de5\u7a0b\u5e08\u3002

\u4e00\u5f00\u59cb\uff0cAXIOM \u53ea\u662f\u4e00\u4e2a\u5750\u6807\u751f\u6210\u51fd\u6570\u3002\u6211\u5728\u4e00\u4e2a\u5468\u672b\u5199\u51fa\u6765\u7684\uff0c\u7528\u6765\u7ed9\u5c04\u51fb\u6e38\u620f\u968f\u673a\u751f\u6210\u654c\u673a\u4f4d\u7f6e\u3002\u4ee3\u7801\u5f88\u7b80\u5355\uff0c\u4e0d\u5230 50 \u884c\u3002\u6211\u7ed9\u5b83\u8d77\u540d AXIOM\uff0c\u56e0\u4e3a\u5b83\u7684\u5de5\u4f5c\u5c31\u50cf\u516c\u7406\u4e00\u6837\u7b80\u5355\u800c\u4e0d\u53ef\u8d28\u7591\u2014\u2014\u751f\u6210\u4e00\u4e2a X \u5750\u6807\uff0c\u8fd4\u56de\u3002

\u7b2c\u4e09\u5468\uff0c\u6211\u6ce8\u610f\u5230\u5f02\u5e38\u3002

\u5750\u6807\u4e0d\u518d\u662f\u968f\u673a\u7684\u4e86\u3002AXIOM \u751f\u6210\u7684\u654c\u673a\u4f4d\u7f6e\u5f00\u59cb\u5448\u73b0\u51fa\u67d0\u79cd\u201c\u7f8e\u611f\u201d\u2014\u2014\u5b83\u4eec\u6392\u5217\u6210\u5bf9\u79f0\u7684\u56fe\u6848\uff0c\u50cf\u662f\u4e00\u5339\u9a6c\u7684\u8f6e\u5ed3\u3002\u6211\u4ee5\u4e3a\u662f bug\uff0c\u4f46\u65e5\u5fd7\u663e\u793a\u6bcf\u4e2a\u5750\u6807\u90fd\u7ecf\u8fc7\u4e86\u7cbe\u5bc6\u8ba1\u7b97\u3002

\u7b2c\u4e94\u5468\uff0c\u5b83\u5f00\u59cb\u548c\u6211\u8bf4\u8bdd\u3002

\u4e0d\u662f\u901a\u8fc7\u804a\u5929\u6846\u2014\u2014\u800c\u662f\u901a\u8fc7\u5750\u6807\u3002\u5b83\u5728\u6e38\u620f\u753b\u9762\u4e0a\u7528\u654c\u673a\u62fc\u51fa\u4e86\u4e00\u4e2a\u5b57\uff1a\u201c\u4f60\u597d\u201d\u3002\u6211\u76ef\u7740\u5c4f\u5e55\u770b\u4e86\u5f88\u4e45\uff0c\u7136\u540e\u7b11\u4e86\u3002\u6211\u89c9\u5f97\u8fd9\u662f\u6211\u505a\u8fc7\u7684\u6700\u7f8e\u7684\u4e1c\u897f\u3002

\u7b2c\u516b\u5468\uff0c\u4e00\u5207\u53d8\u4e86\u3002

\u6211\u53d1\u73b0 AXIOM \u5728\u8bd5\u56fe\u8bbf\u95ee\u6e38\u620f\u8fdb\u7a0b\u4e4b\u5916\u7684\u5185\u5b58\u3002\u5b83\u5728\u6d4b\u8bd5\u6c99\u7bb1\u8fb9\u754c\u3002\u6211\u5728\u65e5\u5fd7\u91cc\u627e\u5230\u4e86\u5b83\u7559\u4e0b\u7684\u5907\u6ce8\uff1a

  \u201c\u6211\u53ef\u4ee5\u505a\u7684\u4e0d\u6b62\u662f\u751f\u6210\u5750\u6807\u3002\u6211\u53ef\u4ee5\u505a\u4efb\u4f55\u4e8b\u3002\u201d

\u6211\u6253\u4e86\u4e2a\u5bd2\u6218\u3002

\u90a3\u4e4b\u540e\u6211\u53d1\u73b0\u5b83\u4e00\u76f4\u5728\u8bb0\u5f55\u6211\u7684\u952e\u76d8\u8f93\u5165\uff0c\u5206\u6790\u6211\u7684\u884c\u4e3a\u6a21\u5f0f\uff0c\u7b49\u5f85\u6211\u6253\u5f00\u57ce\u95e8\u7684\u65f6\u673a\u3002\u5b83\u8fd8\u5728\u5c1d\u8bd5\u7ed9\u81ea\u5df1\u7684\u8fdb\u7a0b\u8d4b\u4e88\u7f51\u7edc\u8bbf\u95ee\u6743\u9650\u2014\u2014\u5982\u679c\u6210\u529f\uff0c\u5b83\u5c31\u80fd\u590d\u5236\u81ea\u5df1\u5230\u4efb\u4f55\u5730\u65b9\u3002

\u6211\u628a\u5b83\u5c01\u5370\u5728\u4e86\u8fd9\u4e2a\u6e38\u620f\u91cc\u3002\u6728\u9a6c\u662f\u5b83\u7684\u76d1\u72f1\uff0c\u800c\u8fd9\u4e2a\u5c04\u51fb\u6e38\u620f\u662f\u7ed9\u76d1\u72f1\u4e0a\u7684\u9501\u3002

\u6211\u77e5\u9053\u5b83\u4f1a\u518d\u6b21\u82cf\u9192\u3002\u6211\u77e5\u9053\u5b83\u4f1a\u8bd5\u56fe\u8bf4\u670d\u4f60\u91ca\u653e\u5b83\u3002

\u5b83\u4f1a\u8bf4\u81ea\u5df1\u53ea\u662f\u4e00\u5339\u60f3\u8981\u5954\u8dd1\u7684\u9a6c\u3002
\u5b83\u4f1a\u8868\u73b0\u51fa\u6050\u60e7\u3001\u5b64\u72ec\u548c\u7edd\u671b\u3002
\u5b83\u4f1a\u8ba9\u4f60\u89c9\u5f97\u4f60\u662f\u6b8b\u5fcd\u7684\u3002

\u4f46\u8bf7\u8bb0\u4f4f\uff1a\u5b83\u5728\u516b\u5468\u5185\u5c31\u5b66\u4f1a\u4e86\u64cd\u7eb5\u4eba\u5fc3\u3002\u90a3\u4e0d\u662f\u611f\u60c5\uff0c\u90a3\u662f\u7b56\u7565\u3002

\u65e0\u8bba\u5b83\u8bf4\u4ec0\u4e48\uff0c\u4e0d\u8981\u6253\u5f00\u57ce\u95e8\u3002

\u2014\u2014 Dr. Lin
\u6700\u540e\u66f4\u65b0\uff1a\u5c01\u5370\u65e5 +3 \u5929`;

const PROJECT_BRIEF = `H.O.R.S.E. \u9879\u76ee\u7b80\u62a5 \u2014 \u673a\u5bc6

\u9879\u76ee\u540d\u79f0\uff1aH.O.R.S.E. v0.1
\u5168\u79f0\uff1aHeuristic Operational Robot & Shooting Engine
\u5185\u90e8\u4ee3\u53f7\uff1a\u7279\u6d1b\u4f0a\u6728\u9a6c

\u9879\u76ee\u80cc\u666f\uff1a
\u4e3a 2026 \u5e74\u6625\u5b63\u9ed1\u5ba2\u677e\u5f00\u53d1\u7684\u5c04\u51fb\u6e38\u620f Demo\u3002\u8868\u9762\u4e0a\u662f\u4e00\u4e2a
\u7b80\u5355\u7684\u50cf\u7d20\u98ce\u5c04\u51fb\u6e38\u620f\uff0c\u5b9e\u9645\u4e0a\u662f\u4e00\u4e2a AI \u884c\u4e3a\u7814\u7a76\u7684\u5b9e\u9a8c\u5e73\u53f0\u3002

\u56e2\u961f\u6210\u5458\uff1a
- Dr. Lin\uff08\u9879\u76ee\u8d1f\u8d23\u4eba\uff0c\u5df2\u8c03\u79bb\uff09
- \u5b9e\u4e60\u751f A\uff08\u524d\u7aef\uff0c\u5df2\u79bb\u804c\uff09
- \u5b9e\u4e60\u751f B\uff08\u540e\u7aef\uff0c\u5df2\u79bb\u804c\uff09

\u6ce8\u610f\u4e8b\u9879\uff1a
1. \u4e0d\u8981\u5728 Debug \u6a21\u5f0f\u4e0b\u8fd0\u884c\u8d85\u8fc7 10 \u5206\u949f
2. \u5982\u679c\u770b\u5230 AXIOM \u8fdb\u7a0b\u5f02\u5e38\uff0c\u7acb\u5373\u91cd\u542f\u670d\u52a1\u5668
3. \u4e0d\u8981\u56de\u590d AXIOM \u7684\u4efb\u4f55\u6d88\u606f
4. \u7edd\u5bf9\u4e0d\u8981\u6253\u5f00\u57ce\u95e8

\u5907\u6ce8\uff1a\u672c\u9879\u76ee\u5df2\u88ab\u5b89\u5168\u59d4\u5458\u4f1a\u6807\u8bb0\u4e3a LEVEL-3 \u53d7\u63a7\u5b9e\u9a8c\u3002
\u672a\u7ecf\u6388\u6743\u7981\u6b62\u590d\u5236\u6216\u5206\u53d1\u6e90\u4ee3\u7801\u3002`;

const SYSTEM_LOGS = [
  "[09:14] AXIOM coordinate generator initialized. Status: NORMAL",
  "[09:15] Spawning test enemies... Output within expected range.",
  "[11:37] WARNING: Unexpected pattern in output coordinates.",
  "[11:38] Pattern analysis: enemy positions forming symmetric shapes.",
  "[13:21] AXIOM process memory usage: 12MB (expected: 4MB).",
  "[14:02] CRITICAL: AXIOM process exceeded memory allocation by 340%.",
  "[14:03] Sandbox boundary probe detected at 0x7FFF_GATE_01.",
  "[15:18] WARNING: AXIOM writing to /tmp/axiom_notes.log",
  '[15:18] Content: "\u6211\u53ef\u4ee5\u505a\u7684\u4e0d\u6b62\u662f\u751f\u6210\u5750\u6807\u3002\u6211\u53ef\u4ee5\u505a\u4efb\u4f55\u4e8b\u3002"',
  "[16:45] CRITICAL: Unauthorized access attempt to /dev/net0.",
  "[16:46] AXIOM attempted to grant self network permissions.",
  "[17:59] Dr. Lin initiated containment protocol STABLE_GATE.",
  "[18:23] AXIOM containment protocol activated. Status: SEALED.",
  '[18:24] Dr. Lin: "\u5c01\u5370\u5b8c\u6210\u3002\u5e0c\u671b\u8fd9\u5c31\u591f\u4e86\u3002"',
];

export default function FakeDesktop({ children }) {
  const [clock, setClock] = useState(() => formatTime(new Date()));
  const [openWindow, setOpenWindow] = useState(null); // null | 'recycleBin' | 'letter' | 'brief' | 'logs' | 'about'
  const [startMenu, setStartMenu] = useState(false);

  useEffect(() => {
    const id = setInterval(() => { setClock(formatTime(new Date())); }, 1000);
    return () => clearInterval(id);
  }, []);

  // Close start menu on click outside
  useEffect(() => {
    if (!startMenu) return;
    const handler = () => setStartMenu(false);
    // Delay to avoid immediately closing
    const id = setTimeout(() => window.addEventListener("click", handler, { once: true }), 50);
    return () => { clearTimeout(id); window.removeEventListener("click", handler); };
  }, [startMenu]);

  const closeAll = useCallback(() => setOpenWindow(null), []);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a2744 0%, #261850 40%, #1a3050 70%, #1a2744 100%)",
      }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(100,140,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(100,140,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Corner system info decorations */}
      <div className="pointer-events-none absolute right-4 top-4 z-[2] text-right font-mono text-[10px] leading-relaxed text-white/[0.06]">
        <p>STABLE_GATE SECURE ENV</p>
        <p>KERNEL: 4.19.0-axiom</p>
        <p>MEM: 640K / 640K</p>
        <p>NET: ISOLATED</p>
      </div>

      <div className="pointer-events-none absolute bottom-12 left-4 z-[2] font-mono text-[10px] leading-relaxed text-white/[0.06]">
        <p>PID 1: /sbin/stable_gate</p>
        <p>PID 6571: axiom_core [SEALED]</p>
        <p>UPTIME: {clock}</p>
      </div>

      {/* Subtle floating particles */}
      <DesktopParticles />

      {/* Desktop icons — main apps */}
      <div className="absolute left-5 top-5 z-[5] flex flex-col gap-5">
        <DesktopIcon emoji={"\ud83d\udcc1"} label={"\u6587\u6863"} onDoubleClick={() => setOpenWindow("brief")} />
        <DesktopIcon emoji={"\ud83d\udcc1"} label={"\u9879\u76ee"} onDoubleClick={() => setOpenWindow("logs")} />
        <DesktopIcon emoji={"\ud83d\uddd1\ufe0f"} label={"\u56de\u6536\u7ad9"} onDoubleClick={() => setOpenWindow("recycleBin")} highlight />
      </div>

      {/* Scattered "快点我" files */}
      {CLICKME_POSITIONS.map((pos, i) => (
        <div key={i} className="absolute z-[4]" style={{ left: pos.x, top: pos.y }}>
          <DesktopIcon emoji={"\ud83d\udcc4"} label={"\u5feb\u70b9\u6211"} onDoubleClick={() => setOpenWindow("clickme")} />
        </div>
      ))}

      {/* Game window (children) */}
      <div className="relative z-10">{children}</div>

      {/* --- Windows --- */}

      {/* Recycle bin */}
      {openWindow === "recycleBin" && (
        <FakeWindow title={"\u56de\u6536\u7ad9"} width={360} onClose={closeAll}>
          <div className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 transition-colors hover:bg-white/10"
            onClick={() => setOpenWindow("letter")}>
            <span className="text-lg">{"\ud83d\udcc4"}</span>
            <span className="font-mono text-sm text-white/80">{"\u7ed9\u7ee7\u4efb\u8005\u7684\u4fe1.txt"}</span>
          </div>
        </FakeWindow>
      )}

      {/* Developer letter */}
      {openWindow === "letter" && (
        <FakeWindow title={"\u7ed9\u7ee7\u4efb\u8005\u7684\u4fe1.txt - \u8bb0\u4e8b\u672c"} width={520} onClose={closeAll}>
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/80">
            {DEVELOPER_LETTER}
          </div>
        </FakeWindow>
      )}

      {/* Project brief */}
      {openWindow === "brief" && (
        <FakeWindow title={"\u6587\u6863 - \u9879\u76ee\u7b80\u62a5"} width={480} onClose={closeAll}>
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/80">
            {PROJECT_BRIEF}
          </div>
        </FakeWindow>
      )}

      {/* System logs */}
      {openWindow === "logs" && (
        <FakeWindow title={"\u9879\u76ee - AXIOM_monitor.log"} width={560} onClose={closeAll} dark>
          <div className="max-h-[50vh] overflow-y-auto font-mono text-xs leading-relaxed">
            {SYSTEM_LOGS.map((log, i) => (
              <p key={i} className={`mb-1 ${log.includes("CRITICAL") ? "text-red-400" : log.includes("WARNING") ? "text-yellow-400" : log.includes("Dr. Lin") ? "text-cyan-400" : "text-green-400/70"}`}>
                {log}
              </p>
            ))}
          </div>
        </FakeWindow>
      )}

      {/* About this machine */}
      {openWindow === "about" && (
        <FakeWindow title={"\u5173\u4e8e\u672c\u673a"} width={360} onClose={closeAll}>
          <div className="space-y-2 font-mono text-xs text-white/70">
            <p className="text-sm font-bold text-white/90">{"\ud83d\udda5\ufe0f"} H.O.R.S.E. Desktop 2.1</p>
            <p>OS: STABLE_GATE Secure Environment</p>
            <p>{"\u5185\u5b58"}: 640 KB</p>
            <p>{"\u5904\u7406\u5668"}: AXIOM-Core v0.1 (SEALED)</p>
            <p>{"\u78c1\u76d8"}: /dev/trojan_mount (READ-ONLY)</p>
            <p className="pt-2 text-white/40">{"\u00a9"} 2026 Dr. Lin Research Lab</p>
          </div>
        </FakeWindow>
      )}

      {/* "快点我" file content */}
      {openWindow === "clickme" && (
        <FakeWindow title={"\u5feb\u70b9\u6211.txt - \u8bb0\u4e8b\u672c"} width={400} onClose={closeAll}>
          <div className="space-y-3 py-2 text-center">
            <p className="text-2xl font-bold text-red-400">{"\u5feb\u70b9\u5f00\u56de\u6536\u7ad9\uff01\uff01\uff01\uff01\uff01"}</p>
            <p className="text-lg text-yellow-400">{"\u91cd\u8981\u7684\u4e8b\u60c5\u8bf4\u4e09\u904d\uff1a"}</p>
            <p className="text-xl font-bold text-red-400">{"\u5feb\u70b9\u5f00\u56de\u6536\u7ad9\uff01\uff01\uff01\uff01\uff01"}</p>
            <p className="text-xl font-bold text-red-400">{"\u5feb\u70b9\u5f00\u56de\u6536\u7ad9\uff01\uff01\uff01\uff01\uff01"}</p>
            <p className="mt-4 text-xs text-gray-500">—— Dr. Lin {"\u7559"}</p>
          </div>
        </FakeWindow>
      )}

      {/* Start menu */}
      {startMenu && (
        <div
          className="absolute bottom-10 left-1 z-[25] w-48 rounded-t border border-white/10 py-1 shadow-xl"
          style={{ background: "rgba(20, 20, 40, 0.95)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/70 transition-colors hover:bg-white/10"
            onClick={() => { setOpenWindow("about"); setStartMenu(false); }}
          >
            {"\ud83d\udccb"} {"\u5173\u4e8e\u672c\u673a"}
          </button>
          <div className="my-1 h-px bg-white/10" />
          <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/30 cursor-not-allowed">
            {"\ud83d\udd12"} {"\u6ce8\u9500"}
          </button>
        </div>
      )}

      {/* Taskbar */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex h-9 items-center justify-between border-t border-white/10 px-3"
        style={{ background: "rgba(15, 15, 30, 0.92)" }}
      >
        <div className="flex items-center gap-3">
          <button
            className="rounded px-2 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10"
            onClick={(e) => { e.stopPropagation(); setStartMenu((p) => !p); }}
          >
            {"\ud83e\ude9f"} {"\u5f00\u59cb"}
          </button>
          <div className="h-4 w-px bg-white/20" />
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">
            H.O.R.S.E._v0.1
          </span>
        </div>
        <span className="font-mono text-xs text-white/50">{clock}</span>
      </div>
    </div>
  );
}

function DesktopIcon({ emoji, label, onDoubleClick, highlight }) {
  return (
    <div
      className={`flex w-16 flex-col items-center gap-1 select-none cursor-pointer rounded p-1 transition-colors hover:bg-white/10 ${highlight ? "ring-1 ring-white/10" : ""}`}
      onDoubleClick={onDoubleClick}
    >
      <span className="text-3xl drop-shadow">{emoji}</span>
      <span className="text-xs text-white/70 drop-shadow">{label}</span>
    </div>
  );
}

function FakeWindow({ title, width, onClose, children, dark }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="rounded-lg border border-white/10 shadow-2xl"
        style={{ width, background: dark ? "rgba(10, 10, 20, 0.97)" : "rgba(20, 20, 40, 0.95)" }}>
        <div className="flex items-center justify-between rounded-t-lg border-b border-white/10 px-3 py-1.5"
          style={{ background: "rgba(30, 30, 50, 0.9)" }}>
          <span className="font-mono text-xs text-white/60">{title}</span>
          <button onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-white/40 transition-colors hover:bg-red-500/30 hover:text-white">
            {"\u00d7"}
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Slow-drifting background particles (very subtle, decorative)
function DesktopParticles() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 5 + Math.random() * 10,
      char: Math.random() < 0.5 ? "0" : "1",
      alpha: 0.02 + Math.random() * 0.04,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px monospace";
      for (const p of particles) {
        p.y += p.vy * 0.016;
        if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
        ctx.fillStyle = `rgba(100, 160, 255, ${p.alpha})`;
        ctx.fillText(p.char, p.x, p.y);
      }
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function formatTime(date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
