// Crime Kickers — Riso Field Manual: hero / story / video data.
// Folder name kept for import-stability; the design system inside is
// the trademark-safe v2 ("Riso Field Manual"), not the diary look.

export type RisoColor =
  | "pink"
  | "blue"
  | "mustard"
  | "violet"
  | "teal"
  | "coral"
  | "mint";

export type HeroBg = "blue" | "pink" | "violet" | "mustard";

export interface Hero {
  id: string;
  name: string;
  /** Dossier code shown under the monogram stamp. */
  code: string;
  monogram: string;
  tagline: string;
  powerName: string;
  bg: HeroBg;
  bio: string;
  stats: Record<string, number>;
  powers: string[];
  tags: string[];
}

export interface StoryDesign {
  id: string;
  /** File code, e.g. "C-041". */
  code: string;
  title: string;
  blurb: string;
  accent: RisoColor;
  sfx: string;
}

export interface VideoDesign {
  id: string;
  title: string;
  mins: string;
  tag: string;
  color: RisoColor;
  youtube_id: string;
  description: string;
  tags: string[];
}

export const HEROES: Hero[] = [
  {
    id: "windman",
    name: "Windman",
    code: "CK-001",
    monogram: "W",
    tagline: "Moves air. Moves opinions.",
    powerName: "Aerokinesis",
    bg: "blue",
    bio:
      "Class president by day, pressure-system manipulator by lunch break. Marco can shift atmospheric pressure in a 12-foot radius — useful for unlocking doors, ruining picnics, drying homework.",
    stats: { Reach: 4, Speed: 5, Recon: 3, Stealth: 2 },
    powers: [
      "Compressed air pulse",
      "Personal updraft (90 sec)",
      "Pressure read at 100 ft",
      "Vulnerable: humidity > 80%",
    ],
    tags: ["aerial", "support", "control"],
  },
  {
    id: "phoboman",
    name: "Pho-boman",
    code: "CK-002",
    monogram: "P",
    tagline: "Carries broth. Throws broth.",
    powerName: "Thermohydromorphism",
    bg: "pink",
    bio:
      "Theo's grandma's recipe is a state secret. Theo, regrettably, is not. He produces and shapes scalding broth on demand. Health code violations: 14.",
    stats: { Reach: 3, Speed: 2, Recon: 2, Stealth: 1 },
    powers: [
      "Boiling jet (12 ft)",
      "Noodle bind",
      "Scent triangulation",
      "Vulnerable: cold zones",
    ],
    tags: ["frontline", "elemental"],
  },
  {
    id: "primm",
    name: "Primm",
    code: "CK-003",
    monogram: "R",
    tagline: "Negotiates with gravity.",
    powerName: "Mass nullification",
    bg: "violet",
    bio:
      "Primm doesn't fly — gravity just stops being interested when she walks past. Anything within arm's reach loses 80% of its weight. School chairs are no longer safe.",
    stats: { Reach: 5, Speed: 3, Recon: 4, Stealth: 4 },
    powers: [
      "Object levitation (≤ 200 kg)",
      "Personal lift",
      "Soft-fall field",
      "Vulnerable: large metal masses",
    ],
    tags: ["control", "recon"],
  },
  {
    id: "tiebe",
    name: "Tiebe",
    code: "CK-004",
    monogram: "T",
    tagline: "Two sizes too many.",
    powerName: "Volumetric scaling",
    bg: "mustard",
    bio:
      "Tiebe is between 4 inches and 30 feet, depending on her mood and whether the cafeteria has tater tots. Mass conserves; momentum does not.",
    stats: { Reach: 5, Speed: 4, Recon: 2, Stealth: 5 },
    powers: [
      "Macro form (≤ 30 ft)",
      "Micro form (≤ 4 in)",
      "Stomp shockwave",
      "Vulnerable: low ceilings",
    ],
    tags: ["frontline", "scout"],
  },
];

export const STORIES: StoryDesign[] = [
  { id: "s1", code: "C-041", title: "The Mall Was a Mistake",       blurb: "Pho-boman tries the food court.",        accent: "pink",    sfx: "SLURP" },
  { id: "s2", code: "C-040", title: "Floor Is Lava (For Real)",     blurb: "Primm forgets which way is down.",       accent: "blue",    sfx: "DRIFT" },
  { id: "s3", code: "C-039", title: "Tiebe vs. The School Bus",     blurb: "Bus loses. Driver retires.",              accent: "mustard", sfx: "STOMP" },
  { id: "s4", code: "C-038", title: "Detention Dimension",          blurb: "Mr. Pierce found a portal.",              accent: "violet",  sfx: "ZAP"   },
  { id: "s5", code: "C-037", title: "Forgot The Spoon",             blurb: "An entire issue about a spoon.",          accent: "teal",    sfx: "CLINK" },
  { id: "s6", code: "C-036", title: "Wind Chill Factor",            blurb: "Windman vs. the radiator.",               accent: "coral",   sfx: "BRRR"  },
];

export const VIDEOS: VideoDesign[] = [
  { id: "v1", title: "Pho-boman trailer",      mins: "1:24", tag: "TRAILER", color: "pink",    youtube_id: "dQw4w9WgXcQ", description: "Broth as a weapon. The official trailer.",            tags: ["trailer", "action"] },
  { id: "v2", title: "How we drew Windman",    mins: "3:08", tag: "PROCESS", color: "blue",    youtube_id: "9bZkp7q19f0", description: "Inks, pencils, and one very annoyed art teacher.",  tags: ["process", "drawing"] },
  { id: "v3", title: "Tiebe's giant moment",   mins: "0:42", tag: "CLIP",    color: "mustard", youtube_id: "JGwWNGJdvx8", description: "She did not need to be that tall, but here we are.", tags: ["clip", "action"] },
  { id: "v4", title: "Primm field test",       mins: "2:11", tag: "CLIP",    color: "violet",  youtube_id: "kJQP7kiw5Fk", description: "Subject CK-003 in unsupervised gravity conditions.",  tags: ["clip", "powers"] },
  { id: "v5", title: "Dossier 04 assembled",   mins: "4:55", tag: "EPISODE", color: "teal",    youtube_id: "9bZkp7q19f0", description: "Full reel — case file 04 from start to mop-up.",     tags: ["episode", "team"] },
  { id: "v6", title: "Origin: the lunch lady", mins: "1:50", tag: "LORE",    color: "coral",   youtube_id: "JGwWNGJdvx8", description: "Where did the broth actually come from? Yikes.",      tags: ["lore", "origin"] },
];

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */

const RISO_VAR: Record<RisoColor, string> = {
  pink:    "var(--riso-pink)",
  blue:    "var(--riso-blue)",
  mustard: "var(--riso-mustard)",
  violet:  "var(--riso-violet)",
  teal:    "var(--riso-teal)",
  coral:   "var(--riso-coral)",
  mint:    "var(--riso-mint)",
};

export function risoColorVar(c: RisoColor): string {
  return RISO_VAR[c];
}

/** Foreground color readable on a riso swatch background. */
export function risoFg(c: RisoColor): string {
  return c === "mustard" || c === "mint" || c === "pink"
    ? "var(--ink)"
    : "var(--paper-bright)";
}

const HERO_PALETTE: Record<HeroBg, { bg: string; fg: string }> = {
  blue:    { bg: "var(--riso-blue)",    fg: "var(--paper-bright)" },
  pink:    { bg: "var(--riso-pink)",    fg: "var(--ink)" },
  violet:  { bg: "var(--riso-violet)",  fg: "var(--paper-bright)" },
  mustard: { bg: "var(--riso-mustard)", fg: "var(--ink)" },
};

export function heroPalette(bg: HeroBg): { bg: string; fg: string } {
  return HERO_PALETTE[bg];
}

/** Pick a hero record by best-effort name match (used to bind live API entities to design metadata). */
export function pickHeroByName(name: string): Hero {
  const n = name.toLowerCase();
  return (
    HEROES.find((h) => n.includes(h.id) || h.name.toLowerCase() === n) ??
    HEROES[0]
  );
}

const ACCENT_RING: RisoColor[] = ["pink", "blue", "mustard", "violet", "teal", "coral"];
export function accentForIndex(i: number): RisoColor {
  return ACCENT_RING[i % ACCENT_RING.length];
}

const SFX_RING = ["SLURP", "DRIFT", "STOMP", "ZAP", "CLINK", "BRRR"];
export function sfxForIndex(i: number): string {
  return SFX_RING[i % SFX_RING.length];
}
