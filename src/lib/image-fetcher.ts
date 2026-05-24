import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { ALLOWED_IMAGE_TYPES } from "@/lib/config";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB hard cap
const FETCH_TIMEOUT_MS = 15_000;

export class ImageFetchError extends Error {}

/** Controleert of een IPv4/IPv6-adres in een privé- of loopback-bereik valt.
 *  Wordt gebruikt om SSRF richting interne services te blokkeren. */
function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true; // onbekend = blokkeren

  if (family === 4) {
    const parts = address.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  // IPv6
  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("ff")) return true; // multicast
  return false;
}

/** Downloadt een externe afbeelding zonder dat de gebruiker via deze server
 *  interne hosts (databases, metadata-endpoints, lokale services) kan
 *  bereiken. Valideert protocol, DNS-resultaat, content-type en grootte. */
export async function fetchExternalImage(
  rawUrl: string,
): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ImageFetchError("Ongeldige URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ImageFetchError("Alleen http(s)-URL's zijn toegestaan.");
  }

  // DNS-resolve en check alle adressen op privé-bereik. We sturen de fetch
  // daarna naar de originele hostname (niet het IP), zodat hostheaders kloppen
  // en TLS werkt. Dit is geen perfecte verdediging tegen DNS-rebinding maar
  // dekt de meest voorkomende SSRF-paden af.
  let addresses: string[];
  try {
    const resolved = await lookup(parsed.hostname, { all: true });
    addresses = resolved.map((entry) => entry.address);
  } catch {
    throw new ImageFetchError("Kon de host niet opzoeken.");
  }
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new ImageFetchError("Deze host is niet toegestaan.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ClosetCompanion/1.0; +https://example.com/bot)",
      },
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ImageFetchError("Time-out tijdens het ophalen van de afbeelding.");
    }
    throw new ImageFetchError("Kon de afbeelding niet ophalen.");
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new ImageFetchError(
      `Server gaf ${response.status} terug bij het ophalen van de afbeelding.`,
    );
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const allowedSet = new Set<string>(ALLOWED_IMAGE_TYPES);
  if (!allowedSet.has(contentType)) {
    throw new ImageFetchError(
      "De URL verwijst niet naar een ondersteunde afbeelding (JPG/PNG/WEBP).",
    );
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > MAX_BYTES) {
    throw new ImageFetchError("Afbeelding is groter dan 12 MB.");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new ImageFetchError("De afbeelding is leeg.");
  }
  if (arrayBuffer.byteLength > MAX_BYTES) {
    throw new ImageFetchError("Afbeelding is groter dan 12 MB.");
  }

  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "jpg";
  const fileName =
    parsed.pathname.split("/").filter(Boolean).pop()?.slice(0, 80) ||
    `external.${ext}`;

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType,
    originalName: fileName,
  };
}
