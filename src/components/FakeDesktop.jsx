import { useCallback, useEffect, useState } from "react";

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

export default function FakeDesktop({ children }) {
  const [clock, setClock] = useState(() => formatTime(new Date()));
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [showLetter, setShowLetter] = useState(false);

  useEffect(() => {
    const id = setInterval(() => { setClock(formatTime(new Date())); }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRecycleDoubleClick = useCallback(() => {
    setShowRecycleBin(true);
  }, []);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0d1b2a 0%, #1b1040 50%, #0d1b2a 100%)" }}
    >
      {/* Desktop icons */}
      <div className="absolute left-5 top-5 z-[5] flex flex-col gap-5">
        <DesktopIcon emoji={"\ud83d\udcc1"} label={"\u6587\u6863"} />
        <DesktopIcon emoji={"\ud83d\udcc1"} label={"\u9879\u76ee"} />
        <DesktopIcon
          emoji={"\ud83d\uddd1\ufe0f"}
          label={"\u56de\u6536\u7ad9"}
          onDoubleClick={handleRecycleDoubleClick}
          highlight
        />
      </div>

      {/* Game window (children) */}
      <div className="relative z-10">{children}</div>

      {/* Recycle bin file manager window */}
      {showRecycleBin && !showLetter && (
        <FakeWindow
          title={"\u56de\u6536\u7ad9"}
          width={360}
          onClose={() => setShowRecycleBin(false)}
        >
          <div
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 transition-colors hover:bg-white/10"
            onClick={() => setShowLetter(true)}
          >
            <span className="text-lg">{"\ud83d\udcc4"}</span>
            <span className="font-mono text-sm text-white/80">{"\u7ed9\u7ee7\u4efb\u8005\u7684\u4fe1.txt"}</span>
          </div>
        </FakeWindow>
      )}

      {/* Letter notepad window */}
      {showLetter && (
        <FakeWindow
          title={"\u7ed9\u7ee7\u4efb\u8005\u7684\u4fe1.txt - \u8bb0\u4e8b\u672c"}
          width={520}
          onClose={() => { setShowLetter(false); setShowRecycleBin(false); }}
        >
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/80">
            {DEVELOPER_LETTER}
          </div>
        </FakeWindow>
      )}

      {/* Taskbar */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex h-9 items-center justify-between border-t border-white/10 px-3"
        style={{ background: "rgba(15, 15, 30, 0.92)" }}
      >
        <div className="flex items-center gap-3">
          <button className="rounded px-2 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10">
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

// --- Desktop icon ---
function DesktopIcon({ emoji, label, onDoubleClick, highlight }) {
  return (
    <div
      className={`flex w-16 flex-col items-center gap-1 select-none ${onDoubleClick ? "cursor-pointer" : ""} ${highlight ? "rounded p-1 transition-colors hover:bg-white/10" : ""}`}
      onDoubleClick={onDoubleClick}
    >
      <span className="text-3xl drop-shadow">{emoji}</span>
      <span className="text-xs text-white/70 drop-shadow">{label}</span>
    </div>
  );
}

// --- Fake window (file manager / notepad style) ---
function FakeWindow({ title, width, onClose, children }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div
        className="rounded-lg border border-white/10 shadow-2xl"
        style={{ width, background: "rgba(20, 20, 40, 0.95)" }}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between rounded-t-lg border-b border-white/10 px-3 py-1.5"
          style={{ background: "rgba(30, 30, 50, 0.9)" }}
        >
          <span className="font-mono text-xs text-white/60">{title}</span>
          <button
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-white/40 transition-colors hover:bg-red-500/30 hover:text-white"
          >
            {"\u00d7"}
          </button>
        </div>
        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function formatTime(date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
