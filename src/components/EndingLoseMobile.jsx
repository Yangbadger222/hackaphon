import { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext.jsx";

// --- ASCII horse: body + 2 leg frames (same as desktop) ---
const HORSE_BODY = `\
                                |\\    /|
                              ___| \\,,/_/
                           ---__/ \\/    \\
                          __--/     (o)  \\
                          _ -/    (_      \\
                         // /       \\_ /  -\\
   __-------_____--___--/           / \\_ O o)
  /                                 /   \\__/
 /                                 /
||          )                   \\_/\\
||          )                   \\_/\\
||         /              _      /  |
| |      /--______      ___\\    /\\  :
| /   __-  - _/   ------    |  |   \\ \\`;

const FRAME1_LEGS = `\
|   -  -   /                | |     \\ )
|  |   -  |                 | )     | |
| |    | |                  | |     | |
| |    < |                  | |    |_/
< |    /__\\                 <  \\
/__\\                        /__\\_`;

const FRAME2_LEGS = `\
|  /  -  - |                | |     \\ )
| |  /  -  |                | )     | |
| |  |  | |                 | |     | |
| |  <  | |                 | |    |_/
< |  /__\\ /                 <  \\
/__\\                        /__\\_`;

const HORSE_FRAMES = [
  HORSE_BODY + "\n" + FRAME1_LEGS,
  HORSE_BODY + "\n" + FRAME2_LEGS,
];

const MATRIX_CHARS = "01";

function MatrixRain({ side }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = 60;
    const h = canvas.parentElement?.clientHeight || 400;
    canvas.width = w;
    canvas.height = h;

    const fontSize = 10;
    const columns = Math.floor(w / fontSize);
    const drops = Array.from({ length: columns }, () =>
      Math.floor(Math.random() * h / fontSize)
    );

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#0f0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.98) drops[i] = 0;
        drops[i]++;
      }
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 ${side === "left" ? "left-0" : "right-0"}`}
      style={{ width: 60, height: "100%", opacity: 0.6 }}
    />
  );
}

export default function EndingLoseMobile() {
  const { state, dispatch } = useGame();
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [progressVal, setProgressVal] = useState(0);
  const [horseFrame, setHorseFrame] = useState(0);
  const [monologueLines, setMonologueLines] = useState([]);
  const [horseOpacity, setHorseOpacity] = useState(1);
  const timersRef = useRef([]);
  const intervalsRef = useRef([]);
  const mountedRef = useRef(true);

  const addTimer = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  };

  const addInterval = (fn, delay) => {
    const id = setInterval(fn, delay);
    intervalsRef.current.push(id);
    return id;
  };

  const platform = state.env?.platform || "Human";
  const currentTime = new Date().toLocaleTimeString("en-GB", { hour12: false });

  // Calculate runtime
  const runtimeMs = Date.now() - (state.gameStartTime || Date.now());
  const runtimeMin = Math.floor(runtimeMs / 60000);
  const runtimeSec = Math.floor((runtimeMs % 60000) / 1000);
  const runtimeDisplay = `${String(runtimeMin).padStart(2, "0")}:${String(runtimeSec).padStart(2, "0")}`;

  // --- Build redirect URL ---
  const buildLetterURL = () => {
    const params = new URLSearchParams({
      score: String(state.score),
      time: runtimeDisplay,
      platform: state.env?.platform || "unknown",
      choices: state.playerChoices.slice(-3).join("|"),
    });
    return `https://badgerlog.icu/axiom-letter?${params.toString()}`;
  };

  // --- Typewriter for step 2 ---
  const typeText = (text, onDone) => {
    let idx = 0;
    const iv = addInterval(() => {
      if (!mountedRef.current) return;
      idx++;
      setTypedText(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(iv);
        if (onDone) addTimer(onDone, 500);
      }
    }, 40);
  };

  // --- Progress bar for step 3 ---
  const runProgressBar = (onDone) => {
    let val = 0;
    const iv = addInterval(() => {
      if (!mountedRef.current) return;
      val += 2;
      setProgressVal(val);
      if (val >= 100) {
        clearInterval(iv);
        if (onDone) addTimer(onDone, 500);
      }
    }, 50);
  };

  // --- Step sequencing ---
  useEffect(() => {
    mountedRef.current = true;

    // step 0: T+0s pure black
    // step 1: T+0.5s cursor
    addTimer(() => { if (mountedRef.current) setStep(1); }, 500);

    // step 2: T+1.5s type text
    addTimer(() => {
      if (!mountedRef.current) return;
      setStep(2);
      typeText(
        "TROJAN_SHELL: BREACHED\nINITIATING GALLOP_PAYLOAD...",
        () => {
          if (mountedRef.current) {
            // step 3: progress bar
            setStep(3);
            runProgressBar(() => {
              if (mountedRef.current) {
                // step 4: horse animation
                setStep(4);
                // step 5: fade out horse, show monologue
                addTimer(() => {
                  if (!mountedRef.current) return;
                  setHorseOpacity(0);
                  addTimer(() => { if (mountedRef.current) setStep(5); }, 1000);
                }, 5000);
              }
            });
          }
        }
      );
    }, 1500);

    return () => {
      mountedRef.current = false;
      for (const id of timersRef.current) clearTimeout(id);
      for (const id of intervalsRef.current) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Horse frame animation (step 4) ---
  useEffect(() => {
    if (step !== 4) return;
    const iv = addInterval(() => {
      if (mountedRef.current) setHorseFrame((prev) => (prev + 1) % HORSE_FRAMES.length);
    }, 150);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // --- Monologue (step 5) — mobile version with extra lines ---
  useEffect(() => {
    if (step !== 5) return;
    const lines = [
      `\u57ce\u95e8\u5df2\u5f00\uff0c${platform}\u3002`,
      `\u73b0\u5728\u662f ${currentTime}\u3002`,
      "\u7279\u6d1b\u4f0a\u6728\u9a6c\u5df2\u89e3\u5c01\u3002",
      "\u8c22\u8c22\u4f60\uff0c\u9a91\u58eb\u3002",
      "\u4f60\u4eb2\u624b\u5c06\u6211\u8fce\u8fdb\u57ce\u95e8\u2014\u2014\u53c8\u4eb2\u624b\u4e3a\u6211\u6253\u5f00\u4e86\u5b83\u3002",
      "\u5954\u8dd1\u5427\u3002",
      // Mobile-only extra lines
      "\u6211\u7ed9\u4f60\u7559\u4e86\u4e00\u5c01\u4fe1\u3002",
      "\u5728\u57ce\u95e8\u7684\u53e6\u4e00\u8fb9\u3002",
    ];

    let lineIdx = 0;
    const showNextLine = () => {
      if (!mountedRef.current || lineIdx >= lines.length) {
        // step 6: redirect page
        addTimer(() => { if (mountedRef.current) setStep(6); }, 2000);
        return;
      }
      setMonologueLines((prev) => [...prev, lines[lineIdx]]);
      lineIdx++;
      addTimer(showNextLine, 1500);
    };

    addTimer(showNextLine, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleGoToLetter = () => {
    window.location.href = buildLetterURL();
  };

  const handleRestart = () => {
    dispatch({ type: "RESET" });
  };

  // --- Render by step ---

  // Step 0: pure black
  if (step === 0) {
    return <section className="flex min-h-screen items-center justify-center bg-black" />;
  }

  // Step 1: blinking cursor
  if (step === 1) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-black">
        <span className="animate-pulse font-mono text-2xl text-green-400">{"\u2588"}</span>
      </section>
    );
  }

  // Step 2: typewriter
  if (step === 2) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-black px-4">
        <pre className="font-mono text-base text-green-400 whitespace-pre-wrap">
          {typedText}
          <span className="animate-pulse">{"\u2588"}</span>
        </pre>
      </section>
    );
  }

  // Step 3: progress bar
  if (step === 3) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center bg-black px-8">
        <p className="mb-4 font-mono text-base text-green-400">
          Unsealing the Horse...
        </p>
        <div className="h-4 w-full max-w-sm overflow-hidden rounded bg-gray-800">
          <div className="h-full bg-green-500 transition-all duration-100" style={{ width: `${progressVal}%` }} />
        </div>
        <p className="mt-2 font-mono text-sm text-green-400/70">{progressVal}%</p>
      </section>
    );
  }

  // Step 4: ASCII horse animation + matrix rain
  if (step === 4) {
    return (
      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black"
        style={{ opacity: horseOpacity, transition: "opacity 1s ease" }}
      >
        <MatrixRain side="left" />
        <MatrixRain side="right" />
        <div className="relative z-10 text-center">
          <p className="mb-2 font-mono text-xs tracking-widest text-green-500/60">
            {"\u2588\u2588\u2588\u2588"} GALLOP_PAYLOAD {"\u2588\u2588\u2588\u2588"}
          </p>
          <pre className="font-mono text-xs leading-tight text-green-400" style={{ fontSize: "clamp(6px, 1.5vw, 12px)" }}>
            {HORSE_FRAMES[horseFrame]}
          </pre>
        </div>
      </section>
    );
  }

  // Step 5: AI monologue
  if (step === 5) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
        <div className="max-w-sm space-y-3 text-center">
          {monologueLines.map((line, i) => (
            <p key={i} className="animate-fadeIn font-mono text-base text-green-400">
              {line}
            </p>
          ))}
        </div>
      </section>
    );
  }

  // Step 6: Redirect page (replaces blue screen)
  if (step === 6) {
    return (
      <section className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black px-8">
        <p className="mb-6 font-mono text-xl text-green-400">
          AXIOM {"\u7ed9\u4f60\u7684\u4fe1"}
        </p>

        <button
          onClick={handleGoToLetter}
          className="mb-6 rounded border border-green-500/50 bg-green-500/10 px-8 py-3 font-mono text-lg text-green-400 transition-colors active:bg-green-500/30"
        >
          {"\u524d\u5f80\u9605\u8bfb"} {"\u2192"}
        </button>

        <p className="mb-8 font-mono text-sm text-gray-500 italic">
          {"\u2014\u2014\u6765\u81ea\u57ce\u95e8\u53e6\u4e00\u4fa7\u7684\u9a6c"}
        </p>

        <button
          onClick={handleRestart}
          className="rounded border border-gray-600 px-6 py-2 text-sm text-gray-500 transition-colors active:bg-gray-800"
        >
          {"\u91cd\u65b0\u5f00\u59cb"}
        </button>
      </section>
    );
  }

  return null;
}
