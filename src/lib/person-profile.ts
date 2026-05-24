import type { User } from "@prisma/client";

export type PersonProfileFields = Pick<
  User,
  | "ageYears"
  | "heightCm"
  | "bodyBuild"
  | "clothingSize"
  | "hairColor"
  | "hairLength"
  | "hairTexture"
  | "eyeColor"
  | "skinTone"
  | "ethnicLook"
  | "wearsGlasses"
  | "facialHair"
  | "appearanceNotes"
>;

/** Bouwt een lijst korte bullets met aanvullende info over de persoon op basis
 *  van de profielvelden. Bewust geen volzinnen die iets verklaren: het is
 *  *aanvullende* informatie, geen overschrijving van wat het model op de foto
 *  ziet. Lege velden worden overgeslagen. Retourneert null als er niks
 *  ingevuld is — dan blijft de visualize-prompt onveranderd.
 *
 *  Let op: `genderPresentation` is met opzet weggelaten. De foto laat dit
 *  altijd duidelijk zien; het in de prompt zetten kan alleen maar
 *  tegenspraak veroorzaken als het profiel afwijkt van de foto. */
export function describePersonProfile(
  profile: PersonProfileFields | null | undefined,
): string[] | null {
  if (!profile) return null;

  const bullets: string[] = [];

  if (profile.ageYears && profile.ageYears > 0 && profile.ageYears < 150) {
    bullets.push(`leeftijd: ca. ${profile.ageYears} jaar`);
  }
  if (profile.heightCm && profile.heightCm > 100 && profile.heightCm < 230) {
    const meters = (profile.heightCm / 100).toFixed(2).replace(".", ",");
    bullets.push(`lengte: ${meters} m`);
  }
  if (profile.bodyBuild) bullets.push(`postuur: ${profile.bodyBuild}`);
  if (profile.clothingSize) {
    bullets.push(`confectiemaat: ${profile.clothingSize}`);
  }

  const hair: string[] = [];
  if (profile.hairLength) hair.push(profile.hairLength);
  if (profile.hairTexture) hair.push(profile.hairTexture);
  if (profile.hairColor) hair.push(profile.hairColor);
  if (hair.length) bullets.push(`haar: ${hair.join(", ")}`);

  if (profile.eyeColor) bullets.push(`oogkleur: ${profile.eyeColor}`);
  if (profile.skinTone) bullets.push(`huidskleur: ${profile.skinTone}`);
  if (profile.ethnicLook?.trim()) {
    bullets.push(`etnische look: ${profile.ethnicLook.trim()}`);
  }

  if (profile.wearsGlasses === true) bullets.push("draagt een bril");
  if (profile.wearsGlasses === false) bullets.push("draagt geen bril");

  if (profile.facialHair?.trim()) {
    const value = profile.facialHair.trim();
    if (value.toLowerCase() !== "geen") {
      bullets.push(`gezichtsbeharing: ${value}`);
    } else {
      bullets.push("geen gezichtsbeharing");
    }
  }

  if (profile.appearanceNotes?.trim()) {
    bullets.push(`overig: ${profile.appearanceNotes.trim()}`);
  }

  if (bullets.length === 0) return null;
  return bullets;
}
