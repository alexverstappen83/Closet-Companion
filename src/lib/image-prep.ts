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
