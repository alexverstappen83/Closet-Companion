import path from "node:path";

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const cwd = process.cwd();

export const config = {
  uploadDir: process.env.UPLOAD_DIR || path.join(cwd, "data", "uploads"),
  generatedDir: process.env.GENERATED_DIR || path.join(cwd, "data", "generated"),

  monthlyAiBudgetUsd: num(process.env.MONTHLY_AI_BUDGET_USD, 10),

  maxClothingUploadMb: num(process.env.MAX_CLOTHING_UPLOAD_MB, 10),
  maxReferenceUploadMb: num(process.env.MAX_REFERENCE_UPLOAD_MB, 15),
  maxGeneratedImageMb: num(process.env.MAX_GENERATED_IMAGE_MB, 20),

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    textModel: process.env.OPENAI_DEFAULT_TEXT_MODEL || "gpt-4o-mini",
    visionModel: process.env.OPENAI_DEFAULT_VISION_MODEL || "gpt-4o-mini",
    imageModel: process.env.OPENAI_DEFAULT_IMAGE_MODEL || "gpt-image-1",
  },
};

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export function isOpenAiConfigured(): boolean {
  return config.openai.apiKey.length > 0 && config.openai.apiKey !== "change-me";
}
