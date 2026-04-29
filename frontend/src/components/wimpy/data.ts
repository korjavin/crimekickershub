export type WimpyHeroColor = "blue" | "red" | "yellow" | "green" | "purple" | "orange";

export interface WimpyHero {
  id: string;
  name: string;
  tagline: string;
  color: WimpyHeroColor;
  powerName: string;
  issue: string;
  bio: string;
  stats: Record<string, number>;
  powers: string[];
  tags: string[];
}

export interface WimpyStory {
  id: string;
  issue: string;
  title: string;
  blurb: string;
  accent: WimpyHeroColor;
  tilt: number;
  cover: "windy" | "soup" | "size" | "dim" | "spoon" | "rad";
}

export interface WimpyVideo {
  id: string;
  title: string;
  mins: string;
  tag: string;
  color: WimpyHeroColor;
  youtube_id: string;
  description: string;
  tags: string[];
}

export const HEROES: WimpyHero[] = [
  {
    id: "windman",
    name: "Windman",
    tagline: "Blows villains off the map. Literally.",
    color: "blue",
    powerName: "Wind",
    issue: "001",
    bio: "When the gym fan started talking, Marco Wong started LISTENING. Now he's got a whole atmosphere on his side — and a serious problem with hairspray.",
    stats: { Strength: 3, Speed: 5, Smarts: 4, Hair: 4 },
    powers: [
      "Hurricane breath (range: a whole hallway)",
      "Levitates lunch trays",
      "Can dry your homework in 4 seconds",
      "Weakness: ceiling fans",
    ],
    tags: ["aerial", "lawful good", "middle school", "windy"],
  },
  {
    id: "phoboman",
    name: "Pho-boman",
    tagline: "Soup is a weapon. He told me so.",
    color: "red",
    powerName: "Pho-soup",
    issue: "002",
    bio: "Bitten by a radioactive bowl of pho on Tuesday Tot Day, Theo gained the power to summon piping hot broth at will. Mortal enemies: cold pizza.",
    stats: { Strength: 5, Speed: 2, Smarts: 4, Hair: 5 },
    powers: [
      "Boiling broth blast (90mph!)",
      "Noodle lasso",
      "Smell where dinner is from a MILE away",
      "Weakness: Wednesdays",
    ],
    tags: ["melee", "chaotic tasty", "kitchen", "spicy"],
  },
  {
    id: "primm",
    name: "Primm",
    tagline: "Gravity bows down. Like, literally bows.",
    color: "purple",
    powerName: "Gravity",
    issue: "003",
    bio: "Primm fell out of a TREE and didn't hit the ground. Now nothing falls when she's around — including her grades, which is ALSO a problem.",
    stats: { Strength: 2, Speed: 3, Smarts: 5, Hair: 3 },
    powers: [
      "Float anything under 200 lbs",
      "Glue villains to the ceiling",
      "Can skip stairs entirely",
      "Weakness: math homework",
    ],
    tags: ["control", "lawful weird", "rooftops", "floaty"],
  },
  {
    id: "tiebe",
    name: "Tiebe",
    tagline: "Big when she wants. Tiny when she doesn't.",
    color: "yellow",
    powerName: "Size-shifting",
    issue: "004",
    bio: "Tiebe found a button on her sneaker that nobody should've pressed. Now she can be GIANT or ant-sized. Mostly she just uses it to hide from her brother.",
    stats: { Strength: 4, Speed: 4, Smarts: 3, Hair: 5 },
    powers: [
      "Grow 30ft tall (max 90 sec)",
      "Shrink to ant-size",
      "Stomp through doors (rude)",
      "Weakness: ceiling height",
    ],
    tags: ["bruiser", "chaotic kind", "everywhere", "bouncy"],
  },
];

export const STORIES: WimpyStory[] = [
  { id: "s1", issue: "041", title: "The Mall Was a Mistake", blurb: "Windman tries the food court. Pho-boman cries.", accent: "yellow", tilt: -1.2, cover: "windy" },
  { id: "s2", issue: "040", title: "Floor is Lava (For Real)", blurb: "Primm forgets which way is down.", accent: "red", tilt: 1.4, cover: "soup" },
  { id: "s3", issue: "039", title: "Tiebe vs. The School Bus", blurb: "Spoiler: bus loses. Driver retires.", accent: "blue", tilt: -0.6, cover: "size" },
  { id: "s4", issue: "038", title: "Detention Dimension", blurb: "Mr. Pierce found a portal. We're going in.", accent: "green", tilt: 1.0, cover: "dim" },
  { id: "s5", issue: "037", title: "Pho-boman Forgets His Spoon", blurb: "An entire issue about a spoon.", accent: "yellow", tilt: -0.9, cover: "spoon" },
  { id: "s6", issue: "036", title: "Wind Chill Factor", blurb: "Windman versus the radiator. Loser pays for snacks.", accent: "purple", tilt: 1.6, cover: "rad" },
];

export const VIDEOS: WimpyVideo[] = [
  { id: "v1", title: "Pho-boman trailer", mins: "1:24", tag: "TRAILER", color: "red", youtube_id: "dQw4w9WgXcQ", description: "Soup. As. A. Weapon. The official trailer.", tags: ["trailer", "action"] },
  { id: "v2", title: "How we drew Windman", mins: "3:08", tag: "BTS", color: "blue", youtube_id: "9bZkp7q19f0", description: "Inks, pencils, and one VERY annoyed art teacher.", tags: ["bts", "drawing"] },
  { id: "v3", title: "Tiebe's GIANT moment", mins: "0:42", tag: "CLIP", color: "yellow", youtube_id: "JGwWNGJdvx8", description: "She did NOT need to be that tall, but here we are.", tags: ["clip", "action"] },
  { id: "v4", title: "Primm flies (kinda)", mins: "2:11", tag: "CLIP", color: "purple", youtube_id: "kJQP7kiw5Fk", description: "She insists this is flying. The school nurse disagrees.", tags: ["clip", "powers"] },
  { id: "v5", title: "All four heroes assemble", mins: "4:55", tag: "EPISODE", color: "green", youtube_id: "9bZkp7q19f0", description: "The squad finally shows up. Mostly on time.", tags: ["episode", "team"] },
  { id: "v6", title: "Origin: the lunch lady", mins: "1:50", tag: "LORE", color: "orange", youtube_id: "JGwWNGJdvx8", description: "Where did the radioactive pho actually come from? Yikes.", tags: ["lore", "origin"] },
];

export function heroColorVar(color: WimpyHeroColor): string {
  return `var(--marker-${color})`;
}

export function heroFg(color: WimpyHeroColor): string {
  return color === "yellow" || color === "green" ? "var(--ink-1)" : "var(--paper-cream)";
}
