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

export interface VisualizationImage {
  buffer: Buffer;
  mimeType: string;
}

export interface VisualizationItem extends VisualizationImage {
  description: string;
}

/** Genereert een outfitvisualisatie op basis van referentiefoto's én de
 *  daadwerkelijke foto's van de kledingstukken. Door de kledingfoto's mee te
 *  sturen reproduceert het model logo's, prints en kleuren veel trouwer. */
export async function generateOutfitVisualization(params: {
  referenceImages: VisualizationImage[];
  clothingItems: VisualizationItem[];
  context?: string;
}): Promise<{ image: Buffer; usage: AiUsage }> {
  const openai = client();
  const model = config.openai.imageModel;

  const referenceCount = params.referenceImages.length;
  const itemsCount = params.clothingItems.length;
  if (referenceCount === 0) {
    throw new Error("Er is geen referentiefoto om de persoon op te baseren.");
  }
  if (itemsCount === 0) {
    throw new Error("Er zijn geen kledingstukken om te visualiseren.");
  }

  const itemsList = params.clothingItems
    .map(
      (item, index) =>
        `  ${index + 1}. (foto ${referenceCount + index + 1}) ${item.description}`,
    )
    .join("\n");

  const refRange =
    referenceCount === 1 ? "foto 1" : `foto 1 t/m ${referenceCount}`;
  const itemsStart = referenceCount + 1;
  const itemsEnd = referenceCount + itemsCount;
  const itemsRange =
    itemsCount === 1
      ? `foto ${itemsStart}`
      : `foto ${itemsStart} t/m ${itemsEnd}`;

  const prompt = [
    `Je krijgt ${referenceCount + itemsCount} foto's mee, in deze volgorde:`,
    `- ${refRange}: PERSOON-foto's.`,
    `- ${itemsRange}: KLEDING-foto's (één foto per kledingstuk).`,
    "",
    `Uit de PERSOON-foto's (${refRange}) gebruik je UITSLUITEND:`,
    "- het gezicht, kapsel, huidskleur en lichaamsverhoudingen van de persoon",
    "- de pose, lichaamshouding en stand van de handen",
    "- de achtergrond, het kader, de belichting en de fotostijl",
    "Negeer de kleding die op deze foto's te zien is volledig — neem geen logo's,",
    "kleuren, patronen of merken van die kleding over.",
    "",
    `Uit de KLEDING-foto's (${itemsRange}) reproduceer je van elk kledingstuk EXACT:`,
    "- de kleur(en) en kleurverhoudingen",
    "- alle patronen, prints, logo's, merken, tekst, badges en grafische details",
    "- de stof, structuur, glans en kleine details (knopen, naden, zakken)",
    "Pas alleen de pasvorm en val aan op het lichaam en de pose van de persoon.",
    "Verzin geen extra logo's of prints — neem alleen wat zichtbaar is op de foto's.",
    "",
    "De outfit bestaat uit precies deze kledingstukken (per item de bijbehorende foto):",
    itemsList,
    "",
    "Voeg geen kleding of accessoires toe die niet in deze lijst staan.",
    params.context
      ? `Gelegenheid waar deze outfit voor bedoeld is: ${params.context}.`
      : "",
    "",
    "Resultaat: één natuurlijke fotorealistische afbeelding van dezelfde persoon",
    "in deze outfit, met realistische pasvorm en natuurlijke belichting. Geen",
    "visuele resten van de oorspronkelijke kleding uit de persoon-foto's.",
  ]
    .filter(Boolean)
    .join("\n");

  const toUpload = async (img: VisualizationImage, name: string) => {
    const ext = img.mimeType.includes("png")
      ? "png"
      : img.mimeType.includes("webp")
        ? "webp"
        : "jpg";
    return toFile(img.buffer, `${name}.${ext}`, { type: img.mimeType });
  };

  const referenceFiles = await Promise.all(
    params.referenceImages.map((img, index) =>
      toUpload(img, `reference-${index + 1}`),
    ),
  );
  const itemFiles = await Promise.all(
    params.clothingItems.map((item, index) => toUpload(item, `item-${index + 1}`)),
  );

  const result = await openai.images.edit({
    model,
    image: [...referenceFiles, ...itemFiles],
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
