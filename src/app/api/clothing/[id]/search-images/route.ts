import type { NextRequest } from "next/server";

import { isGoogleSearchConfigured } from "@/lib/config";
import {
  GoogleSearchError,
  GoogleSearchNotConfiguredError,
  searchGoogleImages,
} from "@/lib/google-image-search";
import { apiUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await apiUser();
  if (!user) {
    return Response.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  if (!isGoogleSearchConfigured()) {
    return Response.json(
      {
        error:
          "In-app Google-zoekopdracht is niet geconfigureerd. Stel GOOGLE_CSE_API_KEY en GOOGLE_CSE_ID in als env-variabelen.",
        configured: false,
      },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) {
    return Response.json({ error: "Kledingstuk niet gevonden." }, { status: 404 });
  }

  const url = new URL(request.url);
  const query =
    url.searchParams.get("q")?.trim() ||
    [item.brand, item.name, item.colors.slice(0, 2).join(" ")]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (!query) {
    return Response.json(
      { error: "Geef een zoekopdracht op." },
      { status: 400 },
    );
  }

  try {
    const results = await searchGoogleImages(query, 10);
    return Response.json({ results, query });
  } catch (error) {
    if (error instanceof GoogleSearchNotConfiguredError) {
      return Response.json(
        { error: error.message, configured: false },
        { status: 503 },
      );
    }
    if (error instanceof GoogleSearchError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    console.error("[search-images] unexpected", error);
    return Response.json(
      { error: "Zoeken is mislukt. Probeer het opnieuw." },
      { status: 500 },
    );
  }
}
