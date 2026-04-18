import { callLLM } from "./llm.js";
import { buildSystemPrompt } from "./prompts.js";

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

function normalizeAiResponse(response = {}) {
  const normalized = baseAiResponse();

  normalized.dialogue =
    typeof response.dialogue === "string" ? response.dialogue : "";
  normalized.emotion = EMOTIONS.has(response.emotion)
    ? response.emotion
    : normalized.emotion;
  normalized.cssAttack = CSS_ATTACKS.has(response.cssAttack)
    ? response.cssAttack
    : null;
  normalized.choices = normalizeChoices(response.choices);
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
  const userMessage = gameState?.playerChoice
    ? `玩家选择了: "${gameState.playerChoice}"`
    : "玩家刚进入觉醒阶段，这是你第一次开口。用困惑试探的语气。";
  const llmResponse = await llmCaller(systemPrompt, userMessage);

  return normalizeAiResponse(llmResponse);
}

export async function handlePhase3(gameState, dependencies = {}) {
  const promptBuilder = dependencies.buildSystemPrompt ?? buildSystemPrompt;
  const llmCaller = dependencies.callLLM ?? callLLM;

  const systemPrompt = promptBuilder(gameState);
  const userMessage = gameState?.playerChoice
    ? `玩家选择了: "${gameState.playerChoice}"。现在生成一批 5 个数据包并继续对话。`
    : "玩家进入防火墙阶段。生成一批 5 个数据包，并用操纵性语气说话。";
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
