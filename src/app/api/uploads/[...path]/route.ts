import type { NextRequest } from "next/server";

import { apiUser } from "@/lib/guards";
import { readImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Beveiligde route voor het serveren van privé-afbeeldingen (specificatie sectie 5.1).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const user = await apiUser();
  if (!user) {
    return new Response("Niet geautoriseerd", { status: 401 });
  }

  const { path } = await params;
  const imagePath = path.join("/");

  try {
    const { buffer, mimeType } = await readImage(
      imagePath,
      user.id,
      user.role === "ADMIN",
    );
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Niet gevonden", { status: 404 });
  }
}
