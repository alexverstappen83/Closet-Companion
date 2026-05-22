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
