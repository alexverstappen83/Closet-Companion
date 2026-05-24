import { config, isGoogleSearchConfigured } from "@/lib/config";

const ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const FETCH_TIMEOUT_MS = 10_000;

export class GoogleSearchError extends Error {}
export class GoogleSearchNotConfiguredError extends Error {
  constructor() {
    super(
      "Google-zoekopdracht is niet geconfigureerd. Stel GOOGLE_CSE_API_KEY en GOOGLE_CSE_ID in.",
    );
    this.name = "GoogleSearchNotConfiguredError";
  }
}

export interface GoogleImageResult {
  /** Directe URL naar de afbeelding op het oorspronkelijke domein. */
  imageUrl: string;
  /** Kleinere thumbnail (door Google gehost). Vrijwel altijd aanwezig. */
  thumbnailUrl: string | null;
  /** Korte titel zoals Google die heeft afgeleid. */
  title: string;
  /** URL van de pagina waarop de afbeelding staat. */
  contextUrl: string | null;
  /** Breedte en hoogte in pixels indien bekend. */
  width: number | null;
  height: number | null;
}

interface RawGoogleItem {
  title?: string;
  link?: string;
  image?: {
    contextLink?: string;
    thumbnailLink?: string;
    width?: number;
    height?: number;
  };
}

/** Vraagt Google Custom Search API om de eerste N afbeeldingen voor `query`.
 *  Vereist een geconfigureerde API-sleutel en zoekmachine-ID. */
export async function searchGoogleImages(
  query: string,
  count = 10,
): Promise<GoogleImageResult[]> {
  if (!isGoogleSearchConfigured()) {
    throw new GoogleSearchNotConfiguredError();
  }
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    key: config.googleSearch.apiKey,
    cx: config.googleSearch.engineId,
    q: trimmed,
    searchType: "image",
    safe: "active",
    num: String(Math.max(1, Math.min(10, count))),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === "AbortError") {
      throw new GoogleSearchError("Time-out tijdens Google-zoekopdracht.");
    }
    throw new GoogleSearchError("Kon Google-zoekopdracht niet uitvoeren.");
  }
  clearTimeout(timer);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GoogleSearchError(
      `Google gaf ${response.status} terug${body ? `: ${body.slice(0, 200)}` : "."}`,
    );
  }

  const data = (await response.json().catch(() => ({}))) as {
    items?: RawGoogleItem[];
  };
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .filter((item) => typeof item.link === "string" && item.link.length > 0)
    .map((item) => ({
      imageUrl: item.link as string,
      thumbnailUrl: item.image?.thumbnailLink ?? null,
      title: item.title ?? "",
      contextUrl: item.image?.contextLink ?? null,
      width: item.image?.width ?? null,
      height: item.image?.height ?? null,
    }));
}
