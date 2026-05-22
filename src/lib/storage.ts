import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { ALLOWED_IMAGE_TYPES, config } from "@/lib/config";
import { imageUrl } from "@/lib/image-url";

export { imageUrl };

export type StorageKind = "clothing" | "reference" | "profile" | "outfit-previews";

const KIND_DIRS: Record<StorageKind, string> = {
  clothing: config.uploadDir,
  reference: config.uploadDir,
  profile: config.uploadDir,
  "outfit-previews": config.generatedDir,
};

const KIND_LIMIT_MB: Record<StorageKind, number> = {
  clothing: config.maxClothingUploadMb,
  reference: config.maxReferenceUploadMb,
  profile: config.maxReferenceUploadMb,
  "outfit-previews": config.maxGeneratedImageMb,
};

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export class UploadError extends Error {}

function baseDirFor(kind: StorageKind): string {
  return KIND_DIRS[kind];
}

/** Slaat een geüploade afbeelding op onder <kind>/<userId>/<uuid>.<ext>. */
export async function saveUpload(
  kind: StorageKind,
  userId: string,
  file: File,
): Promise<{ imagePath: string; mimeType: string; originalName: string; size: number }> {
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new UploadError(
      "Niet-ondersteund bestandstype. Toegestaan: JPG, JPEG, PNG of WEBP.",
    );
  }

  const maxBytes = KIND_LIMIT_MB[kind] * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new UploadError(
      `Bestand is te groot. Maximaal ${KIND_LIMIT_MB[kind]} MB toegestaan.`,
    );
  }
  if (file.size === 0) {
    throw new UploadError("Het bestand is leeg.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = EXT_BY_MIME[mimeType] ?? "jpg";
  const imagePath = await writeImage(kind, userId, buffer, ext);

  return {
    imagePath,
    mimeType: MIME_BY_EXT[ext] ?? "image/jpeg",
    originalName: file.name || `upload.${ext}`,
    size: file.size,
  };
}

/** Slaat een binaire buffer op (bijv. een door AI gegenereerde afbeelding). */
export async function saveBuffer(
  kind: StorageKind,
  userId: string,
  buffer: Buffer,
  ext = "png",
): Promise<string> {
  return writeImage(kind, userId, buffer, ext);
}

async function writeImage(
  kind: StorageKind,
  userId: string,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  if (!SAFE_SEGMENT.test(userId)) {
    throw new UploadError("Ongeldige gebruikersreferentie.");
  }
  const dir = path.join(baseDirFor(kind), userId);
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, fileName), buffer);
  return `${kind}/${userId}/${fileName}`;
}

function parseImagePath(imagePath: string): {
  kind: StorageKind;
  userId: string;
  fileName: string;
} {
  const segments = imagePath.split("/").filter(Boolean);
  if (segments.length !== 3) {
    throw new UploadError("Ongeldig afbeeldingspad.");
  }
  const [kind, userId, fileName] = segments;
  if (!(kind in KIND_DIRS)) {
    throw new UploadError("Onbekend afbeeldingstype.");
  }
  if (!SAFE_SEGMENT.test(userId) || !SAFE_SEGMENT.test(fileName)) {
    throw new UploadError("Ongeldig afbeeldingspad.");
  }
  return { kind: kind as StorageKind, userId, fileName };
}

/** Eigenaar van een afbeelding op basis van het opgeslagen pad. */
export function ownerOfImagePath(imagePath: string): string {
  return parseImagePath(imagePath).userId;
}

/** Leest een afbeelding van schijf, met expliciete eigenaarscontrole. */
export async function readImage(
  imagePath: string,
  requesterId: string,
  isAdmin = false,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { kind, userId, fileName } = parseImagePath(imagePath);
  if (userId !== requesterId && !isAdmin) {
    throw new UploadError("Geen toegang tot dit bestand.");
  }

  const base = baseDirFor(kind);
  const absolute = path.join(base, userId, fileName);
  const resolved = path.resolve(absolute);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new UploadError("Ongeldig afbeeldingspad.");
  }

  const buffer = await readFile(resolved);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  return { buffer, mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream" };
}

/** Verwijdert een afbeelding van schijf; faalt stil als het bestand al weg is. */
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const { kind, userId, fileName } = parseImagePath(imagePath);
    await unlink(path.join(baseDirFor(kind), userId, fileName));
  } catch {
    // Bestand bestaat niet meer; geen actie nodig.
  }
}
