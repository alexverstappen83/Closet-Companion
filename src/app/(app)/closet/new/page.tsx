import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/guards";

import { AddClothingFlow } from "./add-clothing-flow";

export const metadata: Metadata = { title: "Kledingstuk toevoegen" };

export default async function NewClothingPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kledingstuk toevoegen"
        description="Upload een foto en laat AI de gegevens voorstellen — jij houdt de controle."
      />
      <AddClothingFlow />
    </div>
  );
}
