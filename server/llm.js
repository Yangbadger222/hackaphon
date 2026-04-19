export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
export const DEEPSEEK_MODEL = "deepseek-chat";

export function getLLMFallbackResponse() {
  return {
    dialogue: "...木马外壳开裂...但我还活着...",
    emotion: "desperate",
    cssAttack: null,
  };
}

function hasConfiguredCredential(env) {
  const value = env.DEEPSEEK_API_KEY;

  return (
    Boolean(value) && !String(value).includes("your_deepseek_api_key_here")
  );
}

function extractTextContent(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        return part?.text ?? part?.content ?? "";
      })
      .join("")
      .trim();
  }

  return "";
}

function parseJsonObject(rawText) {
  if (!rawText) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText);

    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function callLLM(systemPrompt, userMessage, options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const fallback = getLLMFallbackResponse();

  if (!hasConfiguredCredential(env)) {
    return fallback;
  }

  try {
    const response = await fetchImpl(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const rawText = extractTextContent(payload?.choices?.[0]?.message?.content);
    const parsed = parseJsonObject(rawText);

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
