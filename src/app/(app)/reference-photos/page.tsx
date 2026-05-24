import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import { ReferencePhotosView } from "./reference-photos-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Referentiefoto's" };

export default async function ReferencePhotosPage() {
  const user = await requireUser();

  const photos = await prisma.referencePhoto.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      imagePath: true,
      isPrimary: true,
      poseDescription: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referentiefoto's"
        description="Een volledige lichaamsfoto die AI gebruikt om outfits op jou te visualiseren."
      />
      <ReferencePhotosView photos={photos} />
    </div>
  );
}
