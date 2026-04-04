const VISION_MODEL = process.env.STOOL_SCOUT_VISION_MODEL || "gpt-4.1-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY || process.env.STOOL_SCOUT_OPENAI_API_KEY || "";
}

function buildSystemPrompt() {
  return [
    "You are helping an educational wellness app prototype classify stool-related traits from a user-provided image.",
    "Return only cautious, descriptive observations. Do not diagnose disease.",
    "If the image is unclear, say so.",
    "Respond with strict JSON using this shape:",
    JSON.stringify({
      imageQuality: "clear | usable | unclear",
      stoolTypeGuess: 4,
      colorGuess: "brown",
      confidence: "low | medium | high",
      summary: "short descriptive sentence",
      cautionSignals: ["optional short caution"],
    }),
  ].join(" ");
}

function buildUserPrompt() {
  return "Estimate the likely Bristol stool type (1-7), likely color from this set: brown, light-brown, green, yellow, black, red, pale, and brief non-diagnostic cautions if visually appropriate. If uncertain, lower confidence and say the image is unclear.";
}

function stripCodeFence(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function normalizeVisionOutput(parsed) {
  const stoolTypeGuess = Number(parsed?.stoolTypeGuess);
  const normalizedType = Number.isFinite(stoolTypeGuess)
    ? Math.min(7, Math.max(1, Math.round(stoolTypeGuess)))
    : null;

  const allowedColors = new Set(["brown", "light-brown", "green", "yellow", "black", "red", "pale"]);
  const colorGuess = typeof parsed?.colorGuess === "string" && allowedColors.has(parsed.colorGuess)
    ? parsed.colorGuess
    : null;

  return {
    imageQuality:
      parsed?.imageQuality === "clear" || parsed?.imageQuality === "usable" || parsed?.imageQuality === "unclear"
        ? parsed.imageQuality
        : "unclear",
    stoolTypeGuess: normalizedType,
    colorGuess,
    confidence:
      parsed?.confidence === "high" || parsed?.confidence === "medium" || parsed?.confidence === "low"
        ? parsed.confidence
        : "low",
    summary: typeof parsed?.summary === "string" ? parsed.summary.trim() : "",
    cautionSignals: Array.isArray(parsed?.cautionSignals)
      ? parsed.cautionSignals.filter((item) => typeof item === "string" && item.trim()).slice(0, 4)
      : [],
  };
}

function extractTextPayload(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const textParts = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

export function isVisionEnabled() {
  return Boolean(getOpenAIApiKey());
}

export async function analyzePhotoWithVision(file) {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return {
      enabled: false,
      provider: "none",
      reason: "missing-api-key",
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      text: {
        format: {
          type: "json_schema",
          name: "stool_scout_photo_read",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              imageQuality: {
                type: "string",
                enum: ["clear", "usable", "unclear"],
              },
              stoolTypeGuess: {
                type: "integer",
                minimum: 1,
                maximum: 7,
              },
              colorGuess: {
                type: "string",
                enum: ["brown", "light-brown", "green", "yellow", "black", "red", "pale"],
              },
              confidence: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
              summary: {
                type: "string",
              },
              cautionSignals: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
            required: ["imageQuality", "stoolTypeGuess", "colorGuess", "confidence", "summary", "cautionSignals"],
          },
        },
      },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: buildSystemPrompt() }],
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: buildUserPrompt() },
            {
              type: "input_image",
              image_url: `data:${file.type};base64,${base64}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = extractTextPayload(data);

  if (!rawText) {
    throw new Error("Vision response was empty.");
  }

  const normalized = normalizeVisionOutput(JSON.parse(stripCodeFence(rawText)));

  return {
    enabled: true,
    provider: "openai",
    model: VISION_MODEL,
    ...normalized,
  };
}
