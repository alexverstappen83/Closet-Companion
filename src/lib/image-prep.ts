import sharp from "sharp";

/** Normaliseert een afbeelding naar JPEG/RGB met een maximale afmeting, zodat
 *  de OpenAI Images-API hem accepteert (geen HEIC, CMYK, alpha-channel issues
 *  of bestanden > 25 MB). Retourneert een nieuwe buffer en het bijbehorende
 *  MIME-type. */
export async function normalizeForOpenAi(
  buffer: Buffer,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<{ buffer: Buffer; mimeType: string }> {
  const maxDimension = options.maxDimension ?? 1536;
  const quality = options.quality ?? 85;

  const output = await sharp(buffer, { failOn: "none" })
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColorspace("srgb")
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  return { buffer: output, mimeType: "image/jpeg" };
}

export interface NormalizedBoundingBox {
  /** Genormaliseerde coördinaten (0-1) ten opzichte van de originele foto. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Knipt een rechthoek uit een afbeelding op basis van genormaliseerde
 *  coördinaten (0-1). Voegt een padding toe zodat ruw geschatte boxen van
 *  GPT-4o Vision iets ruimer worden en het kledingstuk volledig in beeld
 *  blijft. Levert een JPEG buffer met sRGB-kleurruimte. Faalt veilig: als de
 *  box ongeldig is, retourneert hij de hele foto (genormaliseerd). */
export async function cropFromImage(
  buffer: Buffer,
  box: NormalizedBoundingBox,
  options: { paddingPct?: number; maxDimension?: number } = {},
): Promise<{ buffer: Buffer; mimeType: string }> {
  const paddingPct = options.paddingPct ?? 0.06;
  const maxDimension = options.maxDimension ?? 1024;

  const valid =
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.width) &&
    Number.isFinite(box.height) &&
    box.width > 0.02 &&
    box.height > 0.02 &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= 1.001 &&
    box.y + box.height <= 1.001;

  if (!valid) {
    return normalizeForOpenAi(buffer, { maxDimension });
  }

  const base = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const imgWidth = meta.width ?? 0;
  const imgHeight = meta.height ?? 0;
  if (!imgWidth || !imgHeight) {
    return normalizeForOpenAi(buffer, { maxDimension });
  }

  const px = Math.max(0, box.x - paddingPct);
  const py = Math.max(0, box.y - paddingPct);
  const pw = Math.min(1 - px, box.width + paddingPct * 2);
  const ph = Math.min(1 - py, box.height + paddingPct * 2);

  const left = Math.round(px * imgWidth);
  const top = Math.round(py * imgHeight);
  const width = Math.max(1, Math.round(pw * imgWidth));
  const height = Math.max(1, Math.round(ph * imgHeight));

  const output = await sharp(buffer, { failOn: "none" })
    .rotate()
    .extract({ left, top, width, height })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColorspace("srgb")
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return { buffer: output, mimeType: "image/jpeg" };
}
