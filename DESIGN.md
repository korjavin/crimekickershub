---
name: "Crime Kickers - Riso Field Manual"
colors:
  paper: "#f4ecd8"
  paper-2: "#ece2c4"
  paper-bright: "#fbf6e6"
  grid: "#c8c0a4"
  rule: "rgba(40, 30, 20, 0.10)"
  ink: "#1f1d18"
  ink-2: "#4a4538"
  ink-3: "#807a66"
  ink-4: "#aaa490"
  riso-pink: "#ff5a8e"
  riso-blue: "#2541b2"
  riso-teal: "#0d9b8b"
  riso-mustard: "#e8b22e"
  riso-mint: "#9ed8a3"
  riso-violet: "#5b3f9c"
  riso-coral: "#ff7a4c"
  riso-cream: "#fbf6e6"
typography:
  display:
    fontFamily: "Archivo Black, Helvetica Neue, system-ui, sans-serif"
  mono:
    fontFamily: "VT323, Courier New, monospace"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
  hand:
    fontFamily: "Caveat, cursive"
  masthead:
    fontSize: "clamp(48px, 13vw, 124px)"
  section:
    fontSize: "clamp(38px, 9vw, 88px)"
  display-heading:
    fontSize: "clamp(28px, 5.5vw, 56px)"
rounded:
  DEFAULT: "0px"
  stamp: "50%"
spacing:
  grid-gap: "22px"
  page-x: "clamp(16px, 5vw, 64px)"
  card-padding: "16px"
  button-padding: "10px 16px"
shadows:
  flat: "4px 4px 0 {colors.ink}"
  flat-lg: "6px 6px 0 {colors.ink}"
  flat-pink: "4px 4px 0 {colors.riso-pink}"
components:
  card:
    backgroundColor: "{colors.paper-bright}"
    border: "2px solid {colors.ink}"
    padding: "{spacing.card-padding}"
    shadow: "{shadows.flat-lg}"
  button:
    fontFamily: "{typography.display.fontFamily}"
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-bright}"
    border: "2px solid {colors.ink}"
    padding: "{spacing.button-padding}"
    rounded: "{rounded.DEFAULT}"
  pill:
    fontFamily: "{typography.mono.fontFamily}"
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    border: "1.5px solid {colors.ink}"
  stamp:
    fontFamily: "{typography.display.fontFamily}"
    border: "3px double {colors.ink}"
    rounded: "{rounded.stamp}"
  speech:
    fontFamily: "{typography.mono.fontFamily}"
    backgroundColor: "{colors.paper-bright}"
    border: "2px solid {colors.ink}"
    shadow: "3px 3px 0 {colors.ink}"
---

## Brand & Style

The **Crime Kickers - Riso Field Manual** design system is explicitly distinct from standard diary-comic or webtoon aesthetics. It rejects ruled notebook paper and taped stickers in favor of graph paper, riso overprint dots, and hard-cut squared shapes. The visual vocabulary is tactical, slightly utilitarian, but highly vibrant.

## Colors

The core color strategy is built entirely on the concept of physical printing.

- **Paper & Ink:** The foundation is off-white "paper" (`paper`, `paper-bright`) combined with deep charcoal "ink" (`ink`) rather than pure black or pure white. This reduces eye strain and establishes the analog feel.
- **Riso Palette:** The accent colors simulate risograph printing inks. They are flat, slightly "off," and are meant to visually "overprint" together. Key vibrant accents include `riso-pink`, `riso-blue`, and `riso-mustard`.
- **Shadows:** Shadows are never blurred drop shadows. They are always hard, flat-color offsets (e.g., `4px 4px 0 var(--ink)` or `6px 6px 0 var(--riso-pink)`).

## Typography

The typography reinforces the tactical, printed-manual aesthetic without relying on common comic book fonts (like Bangers or Permanent Marker).

- **Display:** `Archivo Black` is used for bold, uppercase hero elements and sound effects (SFX).
- **Body:** `Space Grotesk` is used for readable, modern body copy.
- **Technical/Mono:** `VT323` is used extensively for metadata, navigation links, pills, and speech bars to evoke early computer readouts or typewriter text.
- **Annotations:** `Caveat` is strictly used for "field note" callouts, representing handwritten marginalia.

## Layout & Spacing

Layouts are structured but responsive, utilizing CSS grid (`ck-grid`) with consistent `22px` gaps and fluid typography (`clamp()`) for headings.

- **Containers:** UI elements sit within distinct, bordered containers.
- **Borders:** Heavy use of solid borders (`2px solid ink`) and occasionally double borders (`4px double ink` for the masthead, `3px double` for stamps) to frame content firmly.

## Elevation & Depth

Depth is not achieved through blur or opacity, but through harsh, colorful shadow offsets.

- **Flat Shadows:** Buttons and cards use solid offset shadows (e.g., a `6px 6px 0` shadow in ink, pink, blue, or mustard) to simulate elements stacked physically on top of each other.
- **Interactions:** Buttons depress physically on click, moving their position to close the gap of the offset shadow, rather than changing color or opacity.

## Shapes

The shape language is strictly **Squared / Hard-cut**.

- **No Radii:** Components like cards, buttons, and fields deliberately use `0px` border-radius to maintain the rigid, manual-like feel.
- **Stamps:** The only exception to the squared rule are circular "stamps" (`ck-stamp`), which represent literal physical ink stamps pressed onto the page.

## Components

### Buttons & Pills
Buttons are chunky, uppercase, and feature hard flat shadows that react mechanically to hover and active states. "Pills" are used for tagging, rendered in the monospaced font with thin borders.

### Cards
Cards are the primary structural unit, featuring a bright paper background, a thick ink border, and a pronounced flat shadow. They can take on colored shadows to indicate different categories or states.

### Graphic Elements
- **Speech Bars:** Rectangular, monospaced callouts with a hard-angled tail, replacing standard comic speech bubbles.
- **Highlighters:** Inline text highlights achieved via hard linear gradients to simulate a physical highlighter marker.
- **SFX:** Sound effects use the massive Display font, tight letter-spacing, and harsh offset shadows.

### Studio (Admin) Mode
While the public-facing site uses the bright "Paper" aesthetic, the internal admin tools ("Studio") flip the paradigm to a dark mode, utilizing a deep `riso-blue` background (`#0e1535`) with an overlay of faint pink dots, evoking a blueprint or darkroom environment. Components in the Studio remain rigid and bordered but use reversed-out colors for technical focus.
