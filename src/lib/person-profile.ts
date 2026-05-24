import type { User } from "@prisma/client";

export type PersonProfileFields = Pick<
  User,
  | "ageYears"
  | "heightCm"
  | "bodyBuild"
  | "hairColor"
  | "hairLength"
  | "skinTone"
  | "genderPresentation"
  | "wearsGlasses"
  | "facialHair"
  | "appearanceNotes"
>;

/** Bouwt een natuurlijke, korte Nederlandse beschrijving van de persoon op
 *  basis van de profielvelden. Lege velden worden overgeslagen. Retourneert
 *  null als er niks ingevuld is — dan blijft de visualize-prompt onveranderd. */
export function describePersonProfile(
  profile: PersonProfileFields | null | undefined,
): string | null {
  if (!profile) return null;

  const pieces: string[] = [];

  const headline: string[] = [];
  if (profile.ageYears && profile.ageYears > 0 && profile.ageYears < 150) {
    headline.push(`${profile.ageYears}-jarige`);
  }
  if (profile.genderPresentation) {
    headline.push(profile.genderPresentation);
  } else {
    headline.push("persoon");
  }
  if (headline.length) pieces.push(headline.join(" "));

  if (profile.heightCm && profile.heightCm > 100 && profile.heightCm < 230) {
    const meters = (profile.heightCm / 100).toFixed(2).replace(".", ",");
    pieces.push(`${meters} m lang`);
  }
  if (profile.bodyBuild) pieces.push(`${profile.bodyBuild} postuur`);

  const hair: string[] = [];
  if (profile.hairLength) hair.push(profile.hairLength);
  if (profile.hairColor) hair.push(`${profile.hairColor} haar`);
  if (hair.length) pieces.push(hair.join(" "));

  if (profile.skinTone) pieces.push(`${profile.skinTone} huid`);

  if (profile.wearsGlasses) pieces.push("draagt een bril");
  if (profile.facialHair && profile.facialHair.trim().toLowerCase() !== "geen") {
    pieces.push(profile.facialHair);
  }

  if (profile.appearanceNotes?.trim()) {
    pieces.push(profile.appearanceNotes.trim());
  }

  if (pieces.length === 0) return null;
  return pieces.join(", ");
}
