# Specificatie: AI Kledingkast & Outfitadvies Webapp

## 1. Projectdoel

We bouwen een eerste versie van een webapplicatie waarmee gebruikers hun kledingkast digitaal kunnen vastleggen, kledingstukken kunnen laten herkennen door AI, outfits kunnen samenstellen en persoonlijk stijladvies kunnen krijgen.

Het uiteindelijke doel is dat een gebruiker kledingstukken fotografeert, deze opslaat in een persoonlijke digitale kledingkast en vervolgens via AI kan zien hoe een geadviseerde outfit eruitziet op een eigen foto.

De eerste versie is een hybride MVP:

- de interface moet mooi, modern en verrassend aanvoelen;
- de basisfunctionaliteit moet echt werken;
- gebruikers kunnen accounts hebben;
- kledingfoto’s worden opgeslagen;
- kledingstukken worden gecategoriseerd;
- AI helpt bij herkenning, ordening en stijladvies;
- AI-outfitvisualisatie op de foto van de gebruiker wordt voorbereid en mag onderdeel zijn van de AI-flow;
- alle eigen applicatiedata wordt opgeslagen op de eigen VPS;
- OpenAI wordt gebruikt als externe AI-provider.

De applicatie is in eerste instantie bedoeld als website om gevoel te krijgen bij de mogelijkheden. Later kunnen hier mobiele apps voor iOS en Android uit voortkomen.

---

## 2. Belangrijkste uitgangspunten

### 2.1 MVP-type

De eerste versie is geen puur prototype en ook geen volledig eindproduct.

Het is een hybride MVP:

- mooie interface;
- werkende gebruikersaccounts;
- werkende uploadfunctionaliteit;
- werkende digitale kledingkast;
- werkende AI-herkenning van kledingstukken;
- werkend AI-stijladvies;
- voorbereiding op AI-visualisatie van outfits op de gebruiker;
- deployment op eigen VPS via Docker.

### 2.2 Doelgroep eerste versie

De applicatie wordt voorbereid op meerdere gebruikers.

Elke gebruiker heeft een eigen account en eigen persoonlijke data, waaronder:

- geüploade kledingfoto’s;
- kledingstukken in de digitale kledingkast;
- samengestelde outfits;
- favoriete combinaties;
- persoonlijke voorkeuren;
- referentiefoto’s;
- AI-gebruik en AI-budget;
- gegenereerde outfitvisualisaties.

Gebruikers mogen alleen hun eigen data kunnen zien, bewerken en verwijderen.

De MVP hoeft nog geen publieke community, vriendenfunctie of gedeelde kledingkasten te bevatten, maar de architectuur moet dit later niet onmogelijk maken.

---

## 3. Technische stack

### 3.1 Frontend en applicatie

De applicatie wordt gebouwd met:

- Next.js;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- React;
- server-side routes via Next.js;
- responsive design voor desktop en mobiel gebruik.

### 3.2 Backend en data

De applicatie gebruikt:

- Next.js als full-stack framework;
- PostgreSQL als relationele database;
- Prisma als ORM en database-migratielaag;
- Auth.js voor authenticatie;
- lokale bestandsopslag op de VPS voor kledingfoto’s, referentiefoto’s en gegenereerde afbeeldingen;
- Docker Compose voor deployment.

### 3.3 Geen Supabase Cloud

Supabase Cloud wordt niet gebruikt.

Alle gebruikersdata wordt opgeslagen op de eigen VPS. Er wordt geen externe cloudprovider gebruikt voor database, gebruikersaccounts of bestandsopslag.

OpenAI wordt wel gebruikt als externe AI-provider voor herkenning, stijladvies en beeldgeneratie/-bewerking.

---

## 4. Hosting en deployment

De applicatie moet draaien op een VPS-server.

Servergegevens:

- VPS IP-adres: `149.210.173.127`
- Publieke applicatie-URL: `https://app1.mamuth.nl`
- Deploymentvorm: Docker-container
- Netwerkopzet: achter een bestaande reverse proxy

De Next.js-applicatie moet als Docker-container kunnen draaien en exposeert intern een poort, bijvoorbeeld `3000`.

De bestaande proxy routeert extern verkeer van:

```text
https://app1.mamuth.nl
```

naar de Docker-container.

### 4.1 Docker services

De Docker Compose setup bevat minimaal:

- `web`: de Next.js-applicatie;
- `postgres`: de PostgreSQL-database.

Optioneel later:

- `redis`: voor wachtrijen, sessies of AI-generatiejobs;
- `worker`: voor achtergrondtaken zoals beeldverwerking;
- `minio`: als lokale object storage wanneer de applicatie groeit.

### 4.2 Productie-eisen

De applicatie moet geschikt zijn voor productiegebruik met:

- environment variables voor secrets en configuratie;
- gescheiden configuratie voor development en productie;
- HTTPS via de bestaande proxy;
- geen hardcoded API keys;
- geen hardcoded wachtwoorden;
- eenvoudige herstart via Docker of Docker Compose;
- persistente volumes voor database en uploads;
- duidelijke backupstructuur.

---

## 5. Bestandsopslag

Afbeeldingen worden opgeslagen op een persistent Docker-volume of een gemounte directory op de VPS.

Voorbeeldstructuur:

```text
/data/app1/uploads/clothing
/data/app1/uploads/profile
/data/app1/uploads/reference
/data/app1/uploads/outfits
/data/app1/generated/outfit-previews
```

De database bevat metadata over de bestanden, zoals:

- eigenaar/gebruiker;
- bestandspad;
- originele bestandsnaam;
- bestandstype;
- uploaddatum;
- kledingcategorie;
- tags;
- kleurinformatie;
- gebruik in outfits;
- type afbeelding;
- AI-status;
- eventuele gekoppelde gegenereerde resultaten.

De bestanden zelf worden niet in de database opgeslagen. De database bevat alleen verwijzingen naar bestanden op disk.

### 5.1 Privacy van afbeeldingen

Afbeeldingen mogen niet publiek uitleesbaar zijn via een simpele statische URL.

De applicatie moet uploads serveren via beveiligde routes die controleren:

- of de gebruiker is ingelogd;
- of de gebruiker eigenaar is van het bestand;
- of het bestand hoort bij een outfit, kledingstuk of profiel van die gebruiker;
- of de gebruiker rechten heeft om het bestand te bekijken.

---

## 6. Authenticatie en accountbeheer

De applicatie gebruikt een gesloten registratieproces.

### 6.1 Eerste installatie

Bij de eerste installatie mag de eerste gebruiker zichzelf registreren. Deze eerste gebruiker krijgt automatisch de rol `admin`.

Na het aanmaken van de eerste admin-gebruiker wordt publieke registratie automatisch gesloten.

### 6.2 Rollen

De applicatie kent minimaal twee rollen:

- `admin`;
- `user`.

Een `admin` kan:

- nieuwe gebruikers aanmaken;
- bestaande gebruikers bekijken;
- gebruikers deactiveren;
- wachtwoorden resetten of een resetproces starten;
- opslaggebruik per gebruiker bekijken;
- AI-gebruik per gebruiker bekijken;
- gebruikersbudgetten controleren.

Een gewone `user` kan:

- inloggen;
- eigen kledingstukken uploaden;
- eigen outfits maken;
- eigen voorkeuren beheren;
- eigen referentiefoto’s beheren;
- eigen data verwijderen;
- eigen AI-budget bekijken;
- AI-functies gebruiken zolang het maandbudget beschikbaar is.

### 6.3 Registratiebeleid

Er is geen open registratie.

Nieuwe accounts worden na de eerste installatie uitsluitend aangemaakt door een admin.

Hierdoor blijft de applicatie privé en geschikt als persoonlijke MVP.

### 6.4 Login

De MVP gebruikt e-mail + wachtwoord als primaire loginmethode.

Gebruikers loggen in met:

- e-mailadres;
- wachtwoord.

Wachtwoorden worden nooit plaintext opgeslagen.

Aanbevolen aanpak:

- Auth.js voor sessiebeheer;
- Credentials provider voor e-mail/wachtwoord-login;
- bcrypt of argon2 voor password hashing;
- PostgreSQL voor gebruikers, rollen en sessiedata;
- beveiligde cookies voor sessies;
- login-required middleware voor privépagina’s.

### 6.5 Loginregels

De applicatie moet minimaal ondersteunen:

- login;
- logout;
- beveiligde pagina’s;
- sessiecontrole;
- admin-only pagina’s;
- foutmelding bij verkeerde login;
- geblokkeerde toegang voor gedeactiveerde gebruikers.

### 6.6 Wachtwoordbeheer in MVP

Voor de MVP hoeft er nog geen volledig publiek wachtwoord-resetproces via e-mail te zijn.

Een admin moet wel gebruikers kunnen beheren.

Wachtwoord-reset via admin of tijdelijke resetlink kan later worden toegevoegd.

---

## 7. Referentiefoto’s van gebruikers

Gebruikers kunnen meerdere persoonlijke referentiefoto’s uploaden.

Elke referentiefoto is een reguliere volledige lichaamsfoto waarop de gebruiker van top tot teen zichtbaar is, inclusief schoenen en eventueel hoofddeksel zoals een pet, hoed of muts.

Per gebruiker is er altijd maximaal één actieve primaire referentiefoto.

### 7.1 Type foto

Een referentiefoto is een gewone foto waarop de gebruiker volledig zichtbaar is.

De foto moet idealiter voldoen aan:

- de persoon staat volledig in beeld;
- schoenen zijn zichtbaar;
- het hoofd is zichtbaar;
- eventuele pet, hoed of muts mag zichtbaar zijn;
- de persoon draagt normale kleding;
- de foto is geen scan;
- de foto is geen medische foto;
- de foto is geen ondergoedfoto;
- de foto is geen naaktfoto;
- de foto bevat bij voorkeur maar één persoon;
- de foto is goed belicht;
- de achtergrond is rustig genoeg om de persoon goed te herkennen.

### 7.2 Primaire referentiefoto

De actieve primaire referentiefoto is de standaardfoto die gebruikt wordt voor AI-visualisatie.

Het doel is:

- de gebruiker kiest of ontvangt een outfitadvies;
- de outfit bestaat uit kledingstukken uit de eigen digitale kledingkast;
- de applicatie gebruikt de actieve primaire referentiefoto als basis;
- OpenAI past de primaire foto visueel aan zodat de gebruiker de geadviseerde kleding lijkt te dragen;
- het resultaat wordt opgeslagen als gegenereerde outfitvisualisatie.

### 7.3 Status in MVP

De MVP moet referentiefoto’s ondersteunen en deze kunnen gebruiken in AI-flows.

De MVP moet datastructuren en UI-elementen ondersteunen voor:

- referentiefoto’s uploaden;
- één referentiefoto als primair markeren;
- outfits samenstellen uit kledingstukken;
- outfitadvies genereren;
- een knop zoals `Visualiseer op mij`;
- opslagvelden voor AI-generaties;
- onderscheid tussen originele referentiefoto’s en gegenereerde AI-resultaten.

---

## 8. Kleding toevoegen aan de digitale kledingkast

De applicatie ondersteunt op termijn twee manieren om kleding toe te voegen:

1. losse kledingfoto’s;
2. foto’s van gedragen outfits.

Voor de MVP ligt de focus op losse kledingfoto’s.

### 8.1 Losse kledingfoto’s

Gebruikers kunnen kledingstukken apart uploaden naar hun digitale kledingkast.

Voorbeelden:

- blouse op een hanger;
- pantalon op bed;
- schoenen op de vloer;
- trui tegen een rustige achtergrond;
- pet apart gefotografeerd;
- riem apart gefotografeerd;
- tas apart gefotografeerd.

Deze aanpak is het meest geschikt voor de MVP, omdat elk kledingstuk dan duidelijk als apart item kan worden opgeslagen, gecategoriseerd en later gebruikt kan worden in outfitcombinaties en AI-visualisaties.

### 8.2 Gedragen outfitfoto’s

De applicatie mag later ook foto’s van gedragen outfits ondersteunen.

Een gedragen outfitfoto is een foto waarop iemand meerdere kledingstukken tegelijk draagt.

In een latere versie kan AI mogelijk helpen om hieruit individuele kledingstukken te herkennen of suggesties te doen voor tagging.

In de MVP hoeft extractie uit gedragen outfitfoto’s nog niet volledig te werken.

### 8.3 MVP-prioriteit

De MVP moet minimaal ondersteunen:

- losse kledingfoto uploaden;
- kledingstuk opslaan in de persoonlijke kledingkast;
- kledingstuk categoriseren;
- AI-metadata laten voorstellen;
- metadata handmatig aanpassen;
- kledingstuk gebruiken in een outfit;
- meerdere kledingstukken combineren tot een set;
- foto veilig opslaan op de VPS;
- foto alleen tonen aan de eigenaar.

---

## 9. Kledingmetadata

Per kledingstuk slaat de applicatie praktische metadata op die rijk genoeg is om goed stijladvies te kunnen geven.

### 9.1 Metadata per kledingstuk

Een kledingstuk bevat minimaal:

- foto;
- naam;
- hoofdcategorie;
- subcategorie;
- kleur of kleuren;
- patroon;
- seizoen;
- formaliteit;
- stijl-tags;
- mogelijke gelegenheden;
- optionele notities;
- AI-herkenningsstatus;
- datum toegevoegd;
- datum bijgewerkt.

Voorbeelden van hoofdcategorieën:

- bovenkleding;
- onderkleding;
- schoenen;
- jas;
- accessoires.

Voorbeelden van subcategorieën:

- blouse;
- overhemd;
- T-shirt;
- trui;
- vest;
- blazer;
- pantalon;
- jeans;
- rok;
- jurk;
- sneakers;
- nette schoenen;
- laarzen;
- pet;
- hoed;
- riem;
- tas.

Voorbeelden van stijl-tags:

- casual;
- smart casual;
- chic;
- feestelijk;
- zakelijk;
- minimalistisch;
- streetwear;
- zomers;
- avond;
- klassiek;
- elegant;
- sportief;
- Scandinavisch;
- Frans;
- Italiaans;
- Nederlands casual;
- Europees smart casual.

---

## 10. OpenAI als AI-provider

De applicatie gebruikt OpenAI als centrale AI-provider.

OpenAI wordt gebruikt voor drie hoofdfuncties:

1. kledingstukken herkennen, beschrijven en ordenen;
2. stijladvies maken op basis van de kledingkast, gelegenheid en voorkeuren;
3. een geadviseerde outfit visualiseren op de primaire referentiefoto van de gebruiker.

De applicatie draait zelf op de VPS, maar AI-verwerking gebeurt via de OpenAI API.

Alle originele uploads, metadata, gebruikersdata en gegenereerde resultaten worden opgeslagen op de eigen VPS. OpenAI wordt alleen aangeroepen wanneer een gebruiker een AI-functie gebruikt.

### 10.1 Geen OpenAI API key in frontend

De OpenAI API key mag nooit in de browser terechtkomen.

Alle OpenAI-aanroepen lopen uitsluitend via beveiligde server-side routes in de Next.js-backend.

De API key wordt opgeslagen als environment variable.

Voorbeeld:

```env
OPENAI_API_KEY=...
OPENAI_DEFAULT_TEXT_MODEL=...
OPENAI_DEFAULT_VISION_MODEL=...
OPENAI_DEFAULT_IMAGE_MODEL=...
```

---

## 11. AI-herkenning van kledingstukken

Wanneer een gebruiker een kledingfoto uploadt, stuurt de backend de foto naar OpenAI voor visuele analyse.

OpenAI moet een gestructureerd voorstel teruggeven met onder andere:

- naam;
- hoofdcategorie;
- subcategorie;
- kleuren;
- patroon;
- seizoen;
- formaliteit;
- stijl-tags;
- mogelijke gelegenheden;
- korte omschrijving.

Voorbeeldoutput:

```json
{
  "name": "Lichtblauw linnen overhemd",
  "mainCategory": "bovenkleding",
  "subCategory": "overhemd",
  "colors": ["lichtblauw"],
  "pattern": "effen",
  "seasons": ["lente", "zomer"],
  "formality": "smart casual",
  "styleTags": ["Europees casual", "zomers", "avond"],
  "occasions": ["terras", "diner", "warme zomeravond"],
  "description": "Luchtig overhemd dat goed past bij een nette maar ontspannen zomerlook."
}
```

### 11.1 Gebruikerscontrole

De gebruiker moet AI-suggesties altijd kunnen controleren en aanpassen voordat het kledingstuk definitief wordt opgeslagen.

De interface moet ondersteunen:

- AI-suggesties tonen na upload;
- gebruiker kan velden aanpassen;
- gebruiker kan tags verwijderen;
- gebruiker kan extra tags toevoegen;
- gebruiker kan kledingstuk opslaan zonder AI-suggesties te accepteren;
- gebruiker kan later metadata opnieuw bewerken.

AI-output is altijd een voorstel, geen definitieve waarheid.

---

## 12. AI-ordening van de kledingkast

OpenAI helpt ook bij het ordenen van kledingstukken.

De applicatie mag AI gebruiken voor:

- categorievoorstellen;
- tagvoorstellen;
- kleurherkenning;
- stijlherkenning;
- seizoensindeling;
- formaliteitsinschatting;
- detectie van vergelijkbare kledingstukken;
- suggesties voor ontbrekende metadata;
- suggesties voor combinaties met andere kledingstukken.

De gebruiker behoudt altijd controle.

AI mag nooit ongemerkt bestaande metadata overschrijven zonder dat dit zichtbaar is.

---

## 13. AI-stijladvies

De applicatie gebruikt OpenAI voor persoonlijk stijladvies.

De gebruiker kan een context invullen, bijvoorbeeld:

- feest;
- dresscode;
- avond stappen;
- warme zomeravond;
- diner;
- verjaardag;
- borrel;
- werkdag;
- citytrip;
- strandclub;
- casual dag;
- semi-formele gelegenheid.

De AI moet op basis van de digitale kledingkast een outfitadvies maken.

### 13.1 Input voor stijladvies

Het advies moet rekening houden met:

- beschikbare kledingstukken;
- categorieën;
- kleuren;
- stijl-tags;
- seizoen;
- formaliteit;
- Europese kledingstijlen;
- persoonlijke voorkeuren;
- primaire referentiefoto;
- eerder opgeslagen favoriete outfits;
- eventueel weerscontext in een latere versie.

### 13.2 Europese stijlfocus

De eerste stijlfocus ligt op Europa, met nadruk op:

- Nederlands casual;
- Europees smart casual;
- Franse elegante eenvoud;
- Italiaanse zomerstijl;
- Scandinavisch minimalisme;
- nette avondlooks;
- casual maar verzorgde combinaties.

Voorbeeldadvies:

```text
Voor een warme zomeravond zou ik het lichtblauwe linnen overhemd combineren met de beige pantalon en witte sneakers. Dit geeft een Europese smart-casual look: luchtig, netjes en geschikt voor een terras, diner of ontspannen avond uit.
```

---

## 14. AI-visualisatie op de gebruiker

De applicatie gebruikt OpenAI ook voor het maken van een outfitvisualisatie op de primaire referentiefoto van de gebruiker.

### 14.1 Doel

De gebruiker kiest of ontvangt een outfitadvies op basis van kledingstukken uit de eigen digitale kledingkast.

Daarna kan de gebruiker kiezen voor:

- `Visualiseer op mij`;
- `Maak AI-preview`;
- `Toon deze outfit op mijn foto`.

De applicatie gebruikt dan:

- de actieve primaire referentiefoto van de gebruiker;
- de geselecteerde kledingstukken uit de kledingkast;
- de metadata van deze kledingstukken;
- de context van het advies;
- een zorgvuldig opgebouwde prompt voor OpenAI.

Het resultaat is een nieuwe gegenereerde afbeelding waarop de gebruiker zo realistisch mogelijk te zien is met de geadviseerde outfit.

### 14.2 Belangrijke uitgangspunten

De AI-visualisatie moet niet worden opgezet als generieke avatarfunctie.

Het gewenste resultaat is een bewerkte of nieuw gegenereerde versie van de echte primaire referentiefoto, waarbij de kleding visueel wordt aangepast naar de geadviseerde outfit.

De applicatie moet onderscheid maken tussen:

- originele referentiefoto;
- originele kledingfoto’s;
- AI-gegenereerde outfitpreview;
- definitief opgeslagen AI-resultaat.

### 14.3 Opslag van gegenereerde resultaten

AI-resultaten worden opgeslagen op de VPS.

Voorbeeldlocatie:

```text
/data/app1/generated/outfit-previews
```

De database slaat bij elk gegenereerd resultaat op:

- eigenaar;
- gebruikte primaire referentiefoto;
- gebruikte kledingstukken;
- gebruikte promptversie;
- OpenAI-model;
- kosteninschatting;
- werkelijke of berekende kosten;
- status;
- aanmaakdatum;
- pad naar gegenereerde afbeelding.

### 14.4 Herhaalbaarheid

De app moet een gegenereerde look later kunnen terugvinden en tonen.

De app hoeft dezelfde afbeelding niet exact opnieuw te kunnen genereren.

---

## 15. Privacy bij OpenAI-gebruik

Alle data wordt primair opgeslagen op de eigen VPS.

Voor AI-functionaliteit worden relevante gegevens tijdelijk naar OpenAI gestuurd.

Dit kan gaan om:

- kledingfoto’s;
- metadata van kledingstukken;
- primaire referentiefoto;
- outfitselecties;
- gebruikersprompt of gelegenheid;
- gegenereerde prompt voor beeldbewerking;
- gegenereerde AI-resultaten.

De applicatie moet hier transparant over zijn richting de gebruiker.

### 15.1 Gebruikerscommunicatie

Voordat een gebruiker een AI-functie gebruikt waarbij foto’s naar OpenAI worden gestuurd, moet de interface duidelijk maken:

- welke foto’s worden gebruikt;
- dat de foto’s naar OpenAI worden gestuurd voor verwerking;
- dat het resultaat wordt opgeslagen op de eigen VPS;
- dat AI-verwerking kosten verbruikt uit het maandelijkse AI-tegoed.

### 15.2 Geen directe persoonlijke identifier naar OpenAI

Elke OpenAI-aanroep moet gekoppeld worden aan de ingelogde gebruiker.

De applicatie stuurt nooit het e-mailadres of de naam van de gebruiker direct naar OpenAI als user identifier.

Gebruik in plaats daarvan een gehashte identifier.

Voorbeeld:

```ts
const safetyIdentifier = hashUserId(user.id)
```

De eigen database blijft de bron van waarheid voor:

- welk account de actie uitvoerde;
- hoeveel budget is gebruikt;
- welke kledingstukken zijn gebruikt;
- welke afbeelding is gegenereerd.

---

## 16. Maandelijks AI-tegoed per gebruiker

Elke gebruiker krijgt een maandelijks OpenAI-budget van:

```text
$10 USD per maand
```

Dit budget geldt voor alle OpenAI-functies samen:

- kledingherkenning;
- automatische metadata;
- kledingkastordening;
- stijladvies;
- AI-outfitvisualisaties op de primaire referentiefoto.

### 16.1 Budgetprincipe

De applicatie beheert zelf een intern AI-tegoed per gebruiker.

OpenAI factureert niet rechtstreeks per app-gebruiker.

Daarom moet de applicatie elke AI-aanroep loggen in de eigen database.

### 16.2 Reset van budget

Gebruik voor de MVP een reset per kalendermaand.

Het AI-tegoed wordt op de eerste dag van elke nieuwe maand opnieuw beschikbaar.

### 16.3 Hard limit

Wanneer een gebruiker het maandbudget bereikt, mag de app geen nieuwe betaalde OpenAI-aanroepen meer doen voor die gebruiker.

Voorbeeldmelding:

```text
Je AI-tegoed voor deze maand is op. Je hebt $10,00 van $10,00 gebruikt. Je nieuwe tegoed start volgende maand opnieuw.
```

### 16.4 Waarschuwingen

De app toont waarschuwingen bij:

- 50% gebruikt;
- 80% gebruikt;
- 95% gebruikt;
- 100% gebruikt.

Voorbeeld:

```text
Je hebt ongeveer $8,20 van je maandelijkse AI-tegoed van $10,00 gebruikt.
```

### 16.5 Budgetcontrole vóór AI-aanroep

Voordat de backend een OpenAI-aanroep uitvoert, controleert de applicatie:

1. welke gebruiker is ingelogd;
2. hoeveel AI-budget deze gebruiker deze maand al heeft gebruikt;
3. wat de geschatte kosten van de nieuwe actie zijn;
4. of de actie binnen het resterende budget past.

Als de actie waarschijnlijk over het budget heen gaat, wordt deze niet gestart.

### 16.6 Budgetcontrole na AI-aanroep

Na elke OpenAI-aanroep slaat de applicatie de usage en kosten op.

De app moet minimaal opslaan:

- userId;
- AI-taaktype;
- OpenAI-model;
- input tokens;
- output tokens;
- beeldtokens indien beschikbaar;
- geschatte kosten in USD;
- status;
- foutmelding indien mislukt;
- datum en tijd;
- gekoppeld kledingstuk, outfit of gegenereerde afbeelding.

---

## 17. Belangrijke database-entiteiten

Onderstaande modellen zijn richtinggevend. Claude Code of ChatGPT Code mag deze verder uitwerken in Prisma.

### 17.1 User

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String?
  role          UserRole @default(USER)
  isActive      Boolean  @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum UserRole {
  ADMIN
  USER
}
```

### 17.2 ClothingItem

```prisma
model ClothingItem {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  name            String
  mainCategory    String
  subCategory     String?
  colors          String[]
  pattern         String?
  seasons         String[]
  formality       String?
  styleTags       String[]
  occasions       String[]
  notes           String?

  imagePath       String
  originalName    String?
  mimeType        String?

  aiStatus        String?
  aiRawResponse   Json?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 17.3 ReferencePhoto

```prisma
model ReferencePhoto {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  imagePath       String
  originalName    String?
  mimeType        String?

  isPrimary       Boolean  @default(false)
  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 17.4 Outfit

```prisma
model Outfit {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  name            String
  description     String?
  occasion        String?
  styleTags       String[]
  isFavorite      Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 17.5 OutfitItem

```prisma
model OutfitItem {
  id              String   @id @default(cuid())

  outfitId        String
  clothingItemId  String

  layerType       String?
  sortOrder       Int      @default(0)
}
```

### 17.6 GeneratedOutfitImage

```prisma
model GeneratedOutfitImage {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])

  outfitId            String?
  referencePhotoId    String?

  imagePath           String
  promptVersion       String?
  openAiModel         String?
  estimatedCostUsd    Decimal? @db.Decimal(10, 6)

  status              String
  errorMessage        String?

  createdAt           DateTime @default(now())
}
```

### 17.7 AiUsageLog

```prisma
model AiUsageLog {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  taskType          AiTaskType
  provider          String   @default("openai")
  model             String

  inputTokens       Int?
  outputTokens      Int?
  totalTokens       Int?
  imageCount        Int?
  estimatedCostUsd  Decimal  @db.Decimal(10, 6)
  finalCostUsd      Decimal? @db.Decimal(10, 6)

  relatedClothingId String?
  relatedOutfitId   String?
  relatedImageId    String?

  status            AiUsageStatus
  errorMessage      String?

  createdAt         DateTime @default(now())
}

enum AiTaskType {
  CLOTHING_RECOGNITION
  CLOSET_ORGANIZATION
  STYLE_ADVICE
  OUTFIT_IMAGE_GENERATION
}

enum AiUsageStatus {
  PENDING
  COMPLETED
  FAILED
  BLOCKED_BY_BUDGET
}
```

---

## 18. Belangrijkste pagina’s

### 18.1 Publieke pagina’s

- Loginpagina;
- Eerste registratiepagina, alleen beschikbaar zolang er nog geen admin bestaat.

### 18.2 Beveiligde gebruikerpagina’s

- Dashboard;
- Mijn kledingkast;
- Kledingstuk uploaden;
- Kledingstuk bekijken/bewerken;
- Outfits;
- Outfit maken;
- Stijladvies;
- AI-preview / Visualiseer op mij;
- Referentiefoto’s;
- Profiel;
- AI-budget.

### 18.3 Adminpagina’s

- Gebruikersbeheer;
- Nieuwe gebruiker aanmaken;
- Gebruiker deactiveren;
- AI-gebruik per gebruiker;
- Opslaggebruik;
- Applicatie-instellingen.

---

## 19. Gewenste interface

De interface moet modern, persoonlijk en visueel sterk zijn.

Doel: de gebruiker moet het gevoel krijgen dat dit een luxe, slimme digitale kledingkast is.

### 19.1 Designrichting

Gebruik:

- veel beeld;
- mooie cards;
- zachte schaduwen;
- afgeronde hoeken;
- rustige typografie;
- duidelijke categorieën;
- moderne knoppen;
- subtiele animaties;
- mobile-first layouts;
- goede lege staten;
- persoonlijke microcopy.

### 19.2 UI-componenten

Aanbevolen componenten:

- dashboard cards;
- image upload zones;
- kledingkaartjes;
- tag selectors;
- filterchips;
- outfit builder;
- modal voor AI-resultaat;
- budget progress bar;
- status badges;
- admin tables;
- mobile bottom navigation.

### 19.3 Sfeer

De app moet niet technisch of kil aanvoelen.

De sfeer moet zijn:

- persoonlijk;
- stijlvol;
- behulpzaam;
- modern;
- verrassend;
- geschikt als cadeau;
- visueel aantrekkelijk.

---

## 20. Belangrijkste gebruikersflows

### 20.1 Eerste installatie

1. Applicatie draait op VPS.
2. Gebruiker opent `https://app1.mamuth.nl`.
3. Er bestaat nog geen admin.
4. Eerste gebruiker registreert.
5. Deze gebruiker wordt automatisch admin.
6. Publieke registratie sluit.
7. Admin kan later extra gebruikers aanmaken.

### 20.2 Kledingstuk toevoegen

1. Gebruiker logt in.
2. Gebruiker opent “Kledingstuk toevoegen”.
3. Gebruiker uploadt foto.
4. Backend slaat foto lokaal op de VPS op.
5. Backend stuurt foto naar OpenAI voor analyse.
6. OpenAI geeft metadata-suggesties terug.
7. Gebruiker controleert en past metadata aan.
8. Gebruiker slaat kledingstuk op.
9. Kledingstuk verschijnt in de digitale kledingkast.

### 20.3 Referentiefoto toevoegen

1. Gebruiker opent “Referentiefoto’s”.
2. Gebruiker uploadt volledige lichaamsfoto.
3. Backend slaat foto lokaal op.
4. Gebruiker kan foto als primair markeren.
5. Er mag maximaal één primaire referentiefoto actief zijn.

### 20.4 Outfit maken

1. Gebruiker opent “Outfits”.
2. Gebruiker kiest kledingstukken uit de kledingkast.
3. Gebruiker combineert bijvoorbeeld:
   - blouse;
   - pantalon;
   - schoenen.
4. Gebruiker slaat outfit op.
5. Outfit kan favoriet worden gemaakt.

### 20.5 Stijladvies krijgen

1. Gebruiker opent “Stijladvies”.
2. Gebruiker vult context in, bijvoorbeeld:
   - warme zomeravond;
   - feest;
   - dresscode;
   - avond stappen.
3. Backend verzamelt relevante kledingmetadata.
4. Backend controleert AI-budget.
5. Backend stuurt context en kledingmetadata naar OpenAI.
6. OpenAI geeft outfitadvies.
7. Gebruiker ziet advies met kledingstukken uit eigen kledingkast.
8. Gebruiker kan outfit opslaan.

### 20.6 Outfit visualiseren op gebruiker

1. Gebruiker ontvangt of kiest een outfitadvies.
2. Gebruiker kiest “Visualiseer op mij”.
3. Backend controleert:
   - is er een primaire referentiefoto;
   - zijn de kledingstukken beschikbaar;
   - is er voldoende AI-budget.
4. Backend stuurt primaire referentiefoto en kledinginformatie naar OpenAI.
5. OpenAI maakt een gegenereerde outfitpreview.
6. Backend slaat het resultaat lokaal op de VPS op.
7. Gebruiker ziet de gegenereerde afbeelding.
8. AI-gebruik wordt gelogd.

---

## 21. Security-eisen

De applicatie moet minimaal voldoen aan:

- server-side authenticatie;
- geen API keys in frontend;
- beveiligde uploadroutes;
- bestandsvalidatie op type en grootte;
- alleen toegestane afbeeldingsformaten;
- rate limiting op AI-routes;
- budgetcontrole per gebruiker;
- CSRF-bescherming waar relevant;
- veilige cookies;
- wachtwoordhashing;
- admin-only autorisatie;
- bestandsrechten op VPS goed instellen;
- geen publieke directory voor privéfoto’s.

### 21.1 Toegestane bestandsformaten

Voor uploads:

- JPG;
- JPEG;
- PNG;
- WEBP.

Optioneel later:

- HEIC, als conversie wordt ondersteund.

### 21.2 Uploadlimieten

Voor MVP:

- maximaal 10 MB per kledingfoto;
- maximaal 15 MB per referentiefoto;
- maximaal 20 MB per gegenereerde afbeelding.

Deze waarden moeten configureerbaar zijn.

---

## 22. Environment variables

Voorbeeld `.env`:

```env
DATABASE_URL=postgresql://app_user:password@postgres:5432/app1

AUTH_SECRET=change-me
AUTH_URL=https://app1.mamuth.nl

OPENAI_API_KEY=change-me
OPENAI_DEFAULT_TEXT_MODEL=gpt-4.1-mini
OPENAI_DEFAULT_VISION_MODEL=gpt-4.1-mini
OPENAI_DEFAULT_IMAGE_MODEL=gpt-image-1

APP_BASE_URL=https://app1.mamuth.nl
UPLOAD_DIR=/data/app1/uploads
GENERATED_DIR=/data/app1/generated

MONTHLY_AI_BUDGET_USD=10.00
MAX_CLOTHING_UPLOAD_MB=10
MAX_REFERENCE_UPLOAD_MB=15
MAX_GENERATED_IMAGE_MB=20
```

Let op: modelnamen mogen in de implementatie worden aangepast aan actuele OpenAI-beschikbaarheid en kosten.

---

## 23. Docker Compose richting

Voorbeeldstructuur:

```yaml
services:
  web:
    build: .
    container_name: app1-web
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "3000:3000"
    volumes:
      - /data/app1/uploads:/data/app1/uploads
      - /data/app1/generated:/data/app1/generated
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    container_name: app1-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: app1
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: change-me
    volumes:
      - /data/app1/postgres:/var/lib/postgresql/data
```

De bestaande reverse proxy moet extern verkeer naar de `web` container routeren.

---

## 24. MVP scope

### 24.1 Moet in MVP

De MVP moet bevatten:

- Next.js-applicatie;
- Docker deployment;
- PostgreSQL;
- Prisma;
- Auth.js;
- eerste gebruiker wordt admin;
- admin kan gebruikers aanmaken;
- login met e-mail en wachtwoord;
- kledingfoto uploaden;
- kledingstuk opslaan;
- OpenAI-herkenning voor kledingmetadata;
- metadata handmatig aanpassen;
- digitale kledingkast;
- kleding filteren;
- kleding zoeken;
- referentiefoto’s uploaden;
- primaire referentiefoto kiezen;
- outfits samenstellen;
- AI-stijladvies;
- AI-budget van $10 per gebruiker per kalendermaand;
- AI-gebruik loggen;
- outfitvisualisatie via OpenAI voorbereiden of implementeren als eerste versie;
- gegenereerde beelden lokaal opslaan;
- mooie moderne interface.

### 24.2 Mag later

Deze onderdelen mogen later:

- mobiele iOS-app;
- mobiele Android-app;
- magic link login;
- wachtwoord reset via e-mail;
- publieke registratie;
- vriendenfunctie;
- gedeelde kledingkasten;
- community;
- weer-API;
- agenda-integratie;
- automatische outfitplanning;
- MinIO;
- Redis;
- aparte worker;
- geavanceerde achtergrondverwijdering;
- kledingstukextractie uit gedragen outfitfoto’s;
- betaalde abonnementen;
- notificaties.

---

## 25. Instructie voor ChatGPT Code of Claude Code

Bouw deze applicatie stap voor stap.

Belangrijke werkwijze:

1. Start met projectsetup.
2. Maak Docker Compose werkend.
3. Voeg PostgreSQL en Prisma toe.
4. Voeg Auth.js toe.
5. Bouw eerste registratie/admin-flow.
6. Bouw login.
7. Bouw dashboard.
8. Bouw beveiligde upload van kledingfoto’s.
9. Bouw kledingkastmodel.
10. Voeg OpenAI-kledingherkenning toe.
11. Bouw metadata review/edit UI.
12. Bouw referentiefoto’s.
13. Bouw outfit builder.
14. Bouw stijladvies.
15. Bouw AI-budgetregistratie.
16. Bouw AI-visualisatieflow.
17. Werk de interface visueel af.

Maak geen shortcuts waarbij:

- API keys in de frontend terechtkomen;
- foto’s publiek beschikbaar zijn;
- gebruikers elkaars data kunnen zien;
- OpenAI-aanroepen zonder budgetcontrole worden uitgevoerd;
- wachtwoorden onveilig worden opgeslagen;
- uploads zonder validatie worden geaccepteerd.

Geef prioriteit aan:

- privacy;
- duidelijke architectuur;
- mooie interface;
- goede data-isolatie per gebruiker;
- uitbreidbaarheid naar mobiele apps;
- begrijpelijke code;
- Docker-first deployment.

---

## 26. Samenvatting

Deze applicatie wordt een self-hosted AI-kledingkast op een eigen VPS.

Gebruikers kunnen kledingstukken uploaden, laten herkennen door OpenAI, metadata aanpassen, outfits maken en AI-stijladvies krijgen.

De app gebruikt OpenAI ook voor het visualiseren van outfitadviezen op een primaire referentiefoto van de gebruiker.

Alle applicatiedata, uploads en gegenereerde resultaten worden opgeslagen op de eigen VPS.

OpenAI wordt alleen gebruikt voor AI-verwerking.

Elke gebruiker krijgt een intern AI-budget van `$10 USD` per kalendermaand.

De eerste versie moet mooi, persoonlijk en verrassend aanvoelen, met een moderne interface die later kan doorgroeien naar mobiele apps.
