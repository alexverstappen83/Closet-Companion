import OpenAI, { toFile } from "openai";

import { config, isOpenAiConfigured } from "@/lib/config";
import {
  FORMALITY_LEVELS,
  MAIN_CATEGORIES,
  PATTERNS,
  SEASONS,
  STYLE_TAGS,
  SUB_CATEGORIES,
} from "@/lib/constants";

export class OpenAiNotConfiguredError extends Error {
  constructor() {
    super(
      "OpenAI is niet geconfigureerd. Stel OPENAI_API_KEY in om AI-functies te gebruiken.",
    );
    this.name = "OpenAiNotConfiguredError";
  }
}

// Prijzen per 1M tokens (USD). Mogen aangepast worden aan actuele OpenAI-tarieven.
const TEXT_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};
const DEFAULT_TEXT_PRICING = { input: 0.4, output: 1.6 };

// Vaste kostenraming per gegenereerde afbeelding (gpt-image-1, hoge kwaliteit).
const IMAGE_COST_USD = 0.2;

// Conservatieve vooraframing voor de budgetcontrole vóór een AI-aanroep.
export const ESTIMATED_COST = {
  recognition: 0.01,
  advice: 0.015,
  visualization: IMAGE_COST_USD,
} as const;

export interface AiUsage {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  imageCount?: number;
  costUsd: number;
}

export interface ClothingSuggestion {
  name: string;
  mainCategory: string;
  subCategory: string | null;
  colors: string[];
  pattern: string | null;
  seasons: string[];
  formality: string | null;
  styleTags: string[];
  occasions: string[];
  description: string | null;
}

export interface StyleAdvice {
  outfitName: string;
  advice: string;
  recommendedItemIds: string[];
}

function client(): OpenAI {
  if (!isOpenAiConfigured()) {
    throw new OpenAiNotConfiguredError();
  }
  return new OpenAI({ apiKey: config.openai.apiKey });
}

function textCost(model: string, inputTokens = 0, outputTokens = 0): number {
  const pricing = TEXT_PRICING[model] ?? DEFAULT_TEXT_PRICING;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Stuurt een kledingfoto naar OpenAI en vraagt om gestructureerde metadata. */
export async function recognizeClothing(
  imageBase64: string,
  mimeType: string,
): Promise<{ suggestion: ClothingSuggestion; raw: unknown; usage: AiUsage }> {
  const openai = client();
  const model = config.openai.visionModel;

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content:
          "Je bent een mode-assistent die kledingfoto's analyseert voor een digitale kledingkast. " +
          "Antwoord uitsluitend met geldige JSON in het Nederlands.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Analyseer dit kledingstuk en geef JSON terug met exact deze velden: " +
              "name (korte Nederlandse naam), mainCategory (een van: " +
              MAIN_CATEGORIES.join(", ") +
              "), subCategory (een van: " +
              SUB_CATEGORIES.join(", ") +
              "), colors (array), pattern (een van: " +
              PATTERNS.join(", ") +
              "), seasons (array uit: " +
              SEASONS.join(", ") +
              "), formality (een van: " +
              FORMALITY_LEVELS.join(", ") +
              "), styleTags (array uit: " +
              STYLE_TAGS.join(", ") +
              "), occasions (array met gelegenheden), description (een korte zin).",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const suggestion: ClothingSuggestion = {
    name: asString(parsed.name) ?? "Nieuw kledingstuk",
    mainCategory: asString(parsed.mainCategory) ?? "bovenkleding",
    subCategory: asString(parsed.subCategory),
    colors: asStringArray(parsed.colors),
    pattern: asString(parsed.pattern),
    seasons: asStringArray(parsed.seasons),
    formality: asString(parsed.formality),
    styleTags: asStringArray(parsed.styleTags),
    occasions: asStringArray(parsed.occasions),
    description: asString(parsed.description),
  };

  const usage: AiUsage = {
    model,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    totalTokens: completion.usage?.total_tokens,
    costUsd: textCost(
      model,
      completion.usage?.prompt_tokens,
      completion.usage?.completion_tokens,
    ),
  };

  return { suggestion, raw: parsed, usage };
}

export interface AdviceClothingItem {
  id: string;
  name: string;
  mainCategory: string;
  subCategory: string | null;
  colors: string[];
  formality: string | null;
  seasons: string[];
  styleTags: string[];
}

/** Vraagt OpenAI om persoonlijk stijladvies op basis van de kledingkast. */
export async function generateStyleAdvice(params: {
  occasion: string;
  items: AdviceClothingItem[];
  preferences?: string;
}): Promise<{ advice: StyleAdvice; usage: AiUsage }> {
  const openai = client();
  const model = config.openai.textModel;

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content:
          "Je bent een persoonlijke stylist met focus op Europese stijlen (Nederlands casual, " +
          "Europees smart casual, Franse elegantie, Italiaanse zomerstijl, Scandinavisch minimalisme). " +
          "Je stelt outfits samen uit de bestaande kledingkast van de gebruiker. " +
          "Antwoord uitsluitend met geldige JSON in het Nederlands.",
      },
      {
        role: "user",
        content:
          `Gelegenheid: ${params.occasion}\n` +
          (params.preferences ? `Persoonlijke voorkeuren: ${params.preferences}\n` : "") +
          `Beschikbare kledingkast (JSON): ${JSON.stringify(params.items)}\n\n` +
          "Stel een passende outfit samen met uitsluitend kledingstukken uit deze lijst. " +
          "Geef JSON terug met de velden: outfitName (korte naam), advice (een wervende " +
          "uitleg van 2-4 zinnen), recommendedItemIds (array met id's uit de lijst).",
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const validIds = new Set(params.items.map((item) => item.id));
  const advice: StyleAdvice = {
    outfitName: asString(parsed.outfitName) ?? `Outfit voor ${params.occasion}`,
    advice: asString(parsed.advice) ?? "Geen advies ontvangen.",
    recommendedItemIds: asStringArray(parsed.recommendedItemIds).filter((id) =>
      validIds.has(id),
    ),
  };

  const usage: AiUsage = {
    model,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    totalTokens: completion.usage?.total_tokens,
    costUsd: textCost(
      model,
      completion.usage?.prompt_tokens,
      completion.usage?.completion_tokens,
    ),
  };

  return { advice, usage };
}

/** Genereert een outfitvisualisatie op de referentiefoto van de gebruiker. */
export async function generateOutfitVisualization(params: {
  referenceImage: Buffer;
  referenceMimeType: string;
  itemDescriptions: string[];
  context?: string;
}): Promise<{ image: Buffer; usage: AiUsage }> {
  const openai = client();
  const model = config.openai.imageModel;

  const prompt =
    "Bewerk deze foto van een persoon zo dat dezelfde persoon de volgende outfit draagt. " +
    "Behoud het gezicht, de lichaamsbouw, de pose en de achtergrond exact. " +
    "Vervang uitsluitend de kleding door: " +
    params.itemDescriptions.join("; ") +
    ". " +
    (params.context ? `Gelegenheid: ${params.context}. ` : "") +
    "Het resultaat moet realistisch en natuurlijk ogen, als een echte foto.";

  const ext = params.referenceMimeType.includes("png") ? "png" : "jpg";
  const referenceFile = await toFile(params.referenceImage, `reference.${ext}`, {
    type: params.referenceMimeType,
  });

  const result = await openai.images.edit({
    model,
    image: referenceFile,
    prompt,
    size: "1024x1536",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI gaf geen afbeelding terug.");
  }

  const imageUsage = (
    result as { usage?: { input_tokens?: number; output_tokens?: number } }
  ).usage;
  const usage: AiUsage = {
    model,
    imageCount: 1,
    inputTokens: imageUsage?.input_tokens,
    outputTokens: imageUsage?.output_tokens,
    costUsd: IMAGE_COST_USD,
  };

  return { image: Buffer.from(b64, "base64"), usage };
}
