// Vaste keuzelijsten, afgeleid van de specificatie (sectie 9).

export const MAIN_CATEGORIES = [
  "bovenkleding",
  "onderkleding",
  "schoenen",
  "jas",
  "accessoires",
] as const;

export const SUB_CATEGORIES = [
  "blouse",
  "overhemd",
  "T-shirt",
  "trui",
  "vest",
  "blazer",
  "pantalon",
  "jeans",
  "rok",
  "jurk",
  "sneakers",
  "nette schoenen",
  "laarzen",
  "pet",
  "hoed",
  "riem",
  "tas",
] as const;

export const STYLE_TAGS = [
  "casual",
  "smart casual",
  "chic",
  "feestelijk",
  "zakelijk",
  "minimalistisch",
  "streetwear",
  "zomers",
  "avond",
  "klassiek",
  "elegant",
  "sportief",
  "Scandinavisch",
  "Frans",
  "Italiaans",
  "Nederlands casual",
  "Europees smart casual",
] as const;

export const SEASONS = ["lente", "zomer", "herfst", "winter"] as const;

export const FORMALITY_LEVELS = [
  "casual",
  "smart casual",
  "zakelijk",
  "formeel",
  "feestelijk",
] as const;

export const PATTERNS = [
  "effen",
  "gestreept",
  "geruit",
  "geblokt",
  "bloemen",
  "stippen",
  "print",
  "gemêleerd",
] as const;

export const OCCASION_SUGGESTIONS = [
  "warme zomeravond",
  "feest",
  "avond stappen",
  "diner",
  "verjaardag",
  "borrel",
  "werkdag",
  "citytrip",
  "strandclub",
  "casual dag",
  "semi-formele gelegenheid",
] as const;

export type MainCategory = (typeof MAIN_CATEGORIES)[number];

export const BODY_BUILDS = [
  "slank",
  "atletisch",
  "gemiddeld",
  "gespierd",
  "stevig",
] as const;

export const HAIR_LENGTHS = [
  "kaal/heel kort",
  "kort",
  "halflang",
  "lang",
] as const;

export const HAIR_TEXTURES = [
  "steil",
  "golvend",
  "krullend",
  "kroezend",
] as const;

export const EYE_COLORS = [
  "blauw",
  "groen",
  "grijs",
  "lichtbruin/hazelnoot",
  "bruin",
  "donkerbruin/zwart",
] as const;

export const SKIN_TONES = [
  "licht",
  "medium",
  "getint",
  "donker",
] as const;

export const GENDER_PRESENTATIONS = [
  "man",
  "vrouw",
  "non-binair",
] as const;

export interface BackgroundPreset {
  /** Stabiele code, opgeslagen in de visualize-request. */
  id: string;
  /** Label in de UI. */
  label: string;
  /** Korte beschrijving die in de prompt aan OpenAI wordt meegegeven. */
  prompt: string;
}

/** Vaste set achtergronden waaruit de gebruiker kan kiezen bij het maken van
 *  een AI-preview. "auto" laat de visualize-route zelf een passende achtergrond
 *  kiezen op basis van de gelegenheid van de outfit. */
export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  {
    id: "auto",
    label: "Automatisch (op basis van gelegenheid)",
    prompt: "",
  },
  {
    id: "reference",
    label: "Zoals op de referentiefoto",
    prompt:
      "Behoud de achtergrond, het kader en de belichting zoals te zien op de persoon-foto's.",
  },
  {
    id: "studio-neutral",
    label: "Neutrale studio",
    prompt:
      "Een neutrale, lichtgrijze studioachtergrond, zachte gelijkmatige studiobelichting, schone modefotostijl.",
  },
  {
    id: "studio-white",
    label: "Witte studio",
    prompt:
      "Een schone witte studioachtergrond, heldere gelijkmatige belichting, modecatalogus-stijl.",
  },
  {
    id: "city-street",
    label: "Stadsstraat",
    prompt:
      "Een levendige Europese stadsstraat als achtergrond, lichte beweging in de achtergrond, natuurlijk daglicht, ondiepe scherptediepte.",
  },
  {
    id: "office",
    label: "Modern kantoor",
    prompt:
      "Een modern, licht kantoorinterieur als achtergrond, neutrale kleuren, daglicht door grote ramen.",
  },
  {
    id: "cafe",
    label: "Café / restaurant",
    prompt:
      "Een warm verlicht café- of restaurantinterieur als achtergrond, zachte avondbelichting, gezellige sfeer.",
  },
  {
    id: "nature",
    label: "Park / natuur",
    prompt:
      "Een rustig park of natuurlijke buitenomgeving met groen op de achtergrond, natuurlijk daglicht, ondiepe scherptediepte.",
  },
  {
    id: "evening-out",
    label: "Avond uitgaan",
    prompt:
      "Een sfeervolle avondambiance op straat met warme lichten op de achtergrond, ondiepe scherptediepte, filmische look.",
  },
  {
    id: "beach",
    label: "Strand",
    prompt:
      "Een rustig strand met zee op de achtergrond, helder daglicht, zachte tegenlicht.",
  },
] as const;

export type BackgroundPresetId = (typeof BACKGROUND_PRESETS)[number]["id"];

/** Mapping van een gelegenheid (vrij ingevoerd op de outfit) naar een
 *  background-preset, gebruikt door "Automatisch". */
export function inferBackgroundFromOccasion(
  occasion: string | null | undefined,
): BackgroundPreset {
  const text = (occasion ?? "").toLowerCase();
  const match = (...needles: string[]) =>
    needles.some((needle) => text.includes(needle));

  if (match("strand", "beach", "zee")) return getBackground("beach");
  if (match("werk", "kantoor", "zakelijk", "office", "meeting"))
    return getBackground("office");
  if (match("diner", "restaurant", "lunch", "café", "cafe", "borrel"))
    return getBackground("cafe");
  if (match("stappen", "feest", "club", "avond", "verjaardag", "uitgaan"))
    return getBackground("evening-out");
  if (match("citytrip", "stad", "winkelen", "shopping"))
    return getBackground("city-street");
  if (match("wandel", "park", "natuur", "buiten"))
    return getBackground("nature");

  return getBackground("studio-neutral");
}

function getBackground(id: BackgroundPresetId): BackgroundPreset {
  const preset = BACKGROUND_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Onbekende achtergrond: ${id}`);
  }
  return preset;
}
