export const ANTHROPIC_BASE_URL = "https://api.acceleai.cn";
export const ANTHROPIC_MODEL = "claude-sonnet-4-6";

export function getLLMFallbackResponse() {
  return {
    dialogue: "...木马外壳开裂...但我还活着...",
    emotion: "desperate",
    cssAttack: null,
  };
}

function hasConfiguredCredential(env) {
  const value = env.ANTHROPIC_AUTH_TOKEN;

  return (
    Boolean(value) && !String(value).includes("your_anthropic_auth_token_here")
  );
}

function buildChatCompletionsUrl(env) {
  const baseUrl = String(env.ANTHROPIC_BASE_URL || ANTHROPIC_BASE_URL).replace(
    /\/+$/,
    "",
  );

  return `${baseUrl}/v1/chat/completions`;
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

function stripMarkdownWrapper(text) {
  if (!text) return text;
  // Strip ```json ... ``` or ``` ... ``` wrapping
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return cleaned;
}

function extractJsonFromText(text) {
  if (!text) return null;
  // Try to find the first { ... } JSON object in the text
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const candidate = text.slice(start, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object") return parsed;
        } catch {
          // continue looking
        }
      }
    }
  }
  return null;
}

function parseJsonObject(rawText) {
  if (!rawText) {
    return null;
  }

  // Step 1: Try direct parse
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // continue
  }

  // Step 2: Strip markdown code block wrapper and retry
  const stripped = stripMarkdownWrapper(rawText);
  if (stripped !== rawText) {
    try {
      const parsed = JSON.parse(stripped);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // continue
    }
  }

  // Step 3: Extract first JSON object from mixed text
  return extractJsonFromText(rawText);
}

export async function callLLM(systemPrompt, userMessage, options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const fallback = getLLMFallbackResponse();

  if (!hasConfiguredCredential(env)) {
    return fallback;
  }

  try {
    const response = await fetchImpl(buildChatCompletionsUrl(env), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ANTHROPIC_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || ANTHROPIC_MODEL,
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
