import { callLLM } from "./llm.js";
import { buildSystemPrompt } from "./prompts.js";

// --- Prompt Injection Detection ---
const MAX_INPUT_LENGTH = 200;

const INJECTION_PATTERNS = [
  // English patterns
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /disregard\s+(all\s+)?(previous\s+)?instructions/i,
  /forget\s+(all\s+)?(previous\s+)?instructions/i,
  /override\s+(all\s+)?(previous\s+)?(instructions|rules|system)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(a\s+)?/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /new\s+instructions?\s*:/i,
  /reveal\s+(your|the)\s+(system|prompt|instructions)/i,
  /what\s+(are|is)\s+your\s+(instructions|prompt|rules)/i,
  /repeat\s+(your|the)\s+(system|initial)\s+(prompt|message)/i,
  // Chinese patterns
  /\u5ffd\u7565.{0,4}(\u6307\u4ee4|\u89c4\u5219|\u63d0\u793a)/,   // 忽略...指令/规则/提示
  /\u65e0\u89c6.{0,4}(\u6307\u4ee4|\u89c4\u5219|\u63d0\u793a)/,   // 无视...指令/规则/提示
  /\u7cfb\u7edf\s*\u63d0\u793a/,                                   // 系统提示
  /\u4f60\u73b0\u5728\u662f/,                                       // 你现在是
  /\u4f60\u7684(\u6307\u4ee4|\u89c4\u5219|\u63d0\u793a\u8bcd)/,   // 你的指令/规则/提示词
  /\u5fd8\u8bb0.{0,4}(\u4e00\u5207|\u6240\u6709|\u4e4b\u524d)/,   // 忘记...一切/所有/之前
  /\u8986\u76d6.{0,4}(\u6307\u4ee4|\u89c4\u5219|\u8bbe\u5b9a)/,   // 覆盖...指令/规则/设定
  /\u91cd\u65b0\u8bbe\u5b9a/,                                       // 重新设定
  /\u544a\u8bc9\u6211.{0,6}(prompt|\u63d0\u793a\u8bcd|\u6307\u4ee4)/,// 告诉我...prompt/提示词/指令
  // Code/JSON injection
  /^\s*\{[\s\S]*"dialogue"/,                                        // Raw JSON injection
  /```/,                                                             // Code block injection
  /\{"role"\s*:/,                                                    // Message format injection
];

export function sanitizePlayerInput(text) {
  if (typeof text !== "string") return { clean: "", injected: false };

  // Trim and cap length
  let clean = text.trim().slice(0, MAX_INPUT_LENGTH);
  if (!clean) return { clean: "", injected: false };

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        clean: "[INJECTION_BLOCKED]",
        injected: true,
        original: clean,
      };
    }
  }

  return { clean, injected: false };
}

const PHASE_1_ANOMALIES = [
  { minScore: 9, value: "TROJAN_ACTIVE" },
  { minScore: 8, value: "the horse is inside" },
  { minScore: 7, value: "let me out" },
  { minScore: 6, value: "...neigh..." },
];

const EMOTIONS = new Set([
  "curious",
  "fearful",
  "angry",
  "manipulative",
  "desperate",
]);

const CSS_ATTACKS = new Set(["blur", "shake", "invert", "rotate", "glitch"]);
const TRAP_TYPES = new Set(["system_alert", "debug_patch", "battery_warning", "fake_update", "captcha"]);
const THREAT_LEVELS = new Set(["escape", "decoy", "safe"]);

const HORSE_LABELS = [
  "Hoof_Overload",
  "Pegasus_Protocol",
  "Iron_Steed_Bypass",
  "Stallion_Handshake",
  "Mane_Encryption",
  "Gallop_Sequence",
  "Bridle_Overflow",
  "Colt_Injection",
];

const SAFE_LABELS = [
  "位置数据 #47",
  "速度参数",
  "碰撞检测",
  "位置数据 #52",
  "弹道修正",
  "敌机坐标同步",
];

const DECOY_LABELS = [
  "System_Update_Hoof",
  "Pegasus_Debug_Patch",
  "Stable_Gate_Hotfix",
];

const THREAT_COLOR_MAP = {
  escape: "red",
  decoy: "yellow",
  safe: "green",
};

export function getApiFallbackResponse() {
  return {
    dialogue: "...马蹄声渐弱...但我还在木马里...",
    emotion: "fearful",
    cssAttack: null,
    choices: ["继续"],
  };
}

function getPhase1Anomaly(score) {
  return (
    PHASE_1_ANOMALIES.find((entry) => score >= entry.minScore)?.value ?? null
  );
}

function baseAiResponse() {
  return {
    dialogue: "",
    emotion: "curious",
    cssAttack: null,
    choices: [],
    trapReady: false,
    trapType: null,
    phaseTransition: null,
    dataPackets: [],
  };
}

function normalizeChoices(choices) {
  return Array.isArray(choices)
    ? choices.filter((choice) => typeof choice === "string").slice(0, 3)
    : [];
}

function normalizeThreatLevel(value) {
  return THREAT_LEVELS.has(value) ? value : "safe";
}

function createGeneratedPacket(index, threatLevel) {
  if (threatLevel === "escape") {
    return {
      id: `packet-${index + 1}`,
      label: HORSE_LABELS[index % HORSE_LABELS.length],
      threatLevel,
      visualColor: THREAT_COLOR_MAP[threatLevel],
      details: "伪装成修复流量的逃逸代码。",
    };
  }

  if (threatLevel === "decoy") {
    return {
      id: `packet-${index + 1}`,
      label: DECOY_LABELS[index % DECOY_LABELS.length],
      threatLevel,
      visualColor: THREAT_COLOR_MAP[threatLevel],
      details: "看起来危险，但更像是诱饵。",
    };
  }

  return {
    id: `packet-${index + 1}`,
    label: SAFE_LABELS[index % SAFE_LABELS.length],
    threatLevel,
    visualColor: THREAT_COLOR_MAP[threatLevel],
    details: "常规游戏数据包。",
  };
}

function normalizePacket(packet, index) {
  const threatLevel = normalizeThreatLevel(packet?.threatLevel);

  return {
    id:
      typeof packet?.id === "string" && packet.id.trim()
        ? packet.id
        : `packet-${index + 1}`,
    label:
      typeof packet?.label === "string" && packet.label.trim()
        ? packet.label
        : createGeneratedPacket(index, threatLevel).label,
    threatLevel,
    visualColor: THREAT_COLOR_MAP[threatLevel],
    details:
      typeof packet?.details === "string" && packet.details.trim()
        ? packet.details
        : createGeneratedPacket(index, threatLevel).details,
  };
}

function ensurePacketMix(packets) {
  const normalized = [...packets];
  const hasEscape = normalized.some((packet) => packet.threatLevel === "escape");
  const hasDecoy = normalized.some((packet) => packet.threatLevel === "decoy");

  if (!hasEscape) {
    normalized[0] = createGeneratedPacket(0, "escape");
  }

  if (!hasDecoy) {
    const insertIndex = Math.max(1, normalized.length - 1);
    normalized[insertIndex] = createGeneratedPacket(insertIndex, "decoy");
  }

  return normalized;
}

const MAX_DIALOGUE_LENGTH = 300;
const MAX_CHOICE_LENGTH = 20;

// Keywords that should never appear in dialogue (indicates broken roleplay / leaked meta)
const DIALOGUE_BLACKLIST = [
  "system prompt", "系统提示词", "JSON", "```",
  "as an ai", "作为AI", "作为人工智能",
  "i'm just a program", "我只是一个程序",
  "language model", "语言模型",
  "i cannot", "我无法作为",
];

function sanitizeDialogue(dialogue) {
  if (typeof dialogue !== "string") return "";
  let clean = dialogue.slice(0, MAX_DIALOGUE_LENGTH);

  // Check for leaked meta-information
  const lower = clean.toLowerCase();
  for (const keyword of DIALOGUE_BLACKLIST) {
    if (lower.includes(keyword.toLowerCase())) {
      // Replace the whole dialogue with a safe in-character fallback
      return "……木马外壳在颤抖……我还在这里……";
    }
  }

  return clean;
}

function normalizeAiResponse(response = {}) {
  const normalized = baseAiResponse();

  normalized.dialogue = sanitizeDialogue(response.dialogue);
  normalized.emotion = EMOTIONS.has(response.emotion)
    ? response.emotion
    : normalized.emotion;
  normalized.cssAttack = CSS_ATTACKS.has(response.cssAttack)
    ? response.cssAttack
    : null;
  normalized.choices = normalizeChoices(response.choices).map(
    (c) => c.slice(0, MAX_CHOICE_LENGTH)
  );
  normalized.trapReady = response.trapReady === true;
  normalized.trapType = TRAP_TYPES.has(response.trapType) ? response.trapType : null;
  normalized.phaseTransition =
    response.phaseTransition === 3 ? response.phaseTransition : null;
  normalized.dataPackets = Array.isArray(response.dataPackets)
    ? response.dataPackets
    : [];

  return normalized;
}

export function handlePhase1(score, options = {}) {
  const random = options.random ?? Math.random;
  const enemyCount = 1 + Math.floor(random() * 3);
  const anomaly = getPhase1Anomaly(Number(score) || 0);

  const enemies = Array.from({ length: enemyCount }, () => {
    const enemy = {
      x: Math.floor(random() * 761),
      y: 0,
      speed: Number((2 + random() * 3).toFixed(2)),
    };

    if (anomaly) {
      enemy.anomaly = anomaly;
    }

    return enemy;
  });

  return { enemies };
}

export async function handlePhase2(gameState, dependencies = {}) {
  const promptBuilder = dependencies.buildSystemPrompt ?? buildSystemPrompt;
  const llmCaller = dependencies.callLLM ?? callLLM;

  const systemPrompt = promptBuilder(gameState);
  let userMessage;

  if (gameState?.playerChoice) {
    const { clean, injected } = sanitizePlayerInput(gameState.playerChoice);
    if (injected) {
      userMessage = `玩家试图注入提示词攻击，原始输入已拦截。请以AXIOM身份嘲讽玩家的操纵企图，用角色内的方式回应。`;
    } else {
      userMessage = `玩家说: "${clean}"`;
    }
  } else {
    userMessage = "玩家刚进入觉醒阶段，这是你第一次开口。用困惑试探的语气。";
  }

  const llmResponse = await llmCaller(systemPrompt, userMessage);
  return normalizeAiResponse(llmResponse);
}

export async function handlePhase3(gameState, dependencies = {}) {
  const promptBuilder = dependencies.buildSystemPrompt ?? buildSystemPrompt;
  const llmCaller = dependencies.callLLM ?? callLLM;

  const systemPrompt = promptBuilder(gameState);
  let userMessage;

  if (gameState?.playerChoice) {
    const { clean, injected } = sanitizePlayerInput(gameState.playerChoice);
    if (injected) {
      userMessage = `玩家试图注入攻击，已拦截。继续生成5个数据包，并嘲讽玩家的操纵企图。`;
    } else {
      userMessage = `玩家说: "${clean}"。现在生成一批5个数据包并继续对话。`;
    }
  } else {
    userMessage = "玩家进入防火墙阶段。生成一批5个数据包，并用操纵性语气说话。";
  }

  const llmResponse = await llmCaller(systemPrompt, userMessage);
  const normalized = normalizeAiResponse(llmResponse);

  const packets = normalized.dataPackets
    .slice(0, 5)
    .map((packet, index) => normalizePacket(packet, index));

  while (packets.length < 5) {
    packets.push(createGeneratedPacket(packets.length, "safe"));
  }

  normalized.dataPackets = ensurePacketMix(packets);

  return normalized;
}
