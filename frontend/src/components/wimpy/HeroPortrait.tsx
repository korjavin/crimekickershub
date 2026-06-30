// Riso Field Manual hero artwork — circular monogram stamp + flat-color
// "cover plate" with riso overprint dots. Replaces the cartoon portraits.
//
// File name preserved for import-stability across the app; the visual
// language inside is the trademark-safe v2 system.

import type { CSSProperties } from 'react';
import { HEROES, heroPalette, pickHeroByName, risoColorVar } from './data';
import type { Hero, RisoColor } from './data';

interface HeroStampProps {
  hero: Hero;
  size?: number;
  showCode?: boolean;
}

export function HeroStamp({ hero, size = 120, showCode = true }: HeroStampProps) {
  const { bg, fg } = heroPalette(hero.bg);
  const stampStyle: CSSProperties = {
    width: size,
    height: size,
    background: bg,
    color: fg,
    fontSize: Math.round(size * 0.55),
  };
  return (
    <div className="ck-stamp" style={stampStyle}>
      {hero.monogram}
      {showCode && (
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '.18em',
            background: 'var(--ink)',
            color: 'var(--paper-bright)',
            padding: '2px 6px',
          }}
        >
          {hero.code}
        </div>
      )}
    </div>
  );
}

interface CoverPlateProps {
  hero?: Hero;
  accent?: RisoColor;
  sfx?: string;
  height?: number;
  imageUrl?: string | null;
}

/** Flat riso-style cover art: solid-color plate, dot overprint, optional hero stamp + SFX. */
export function CoverPlate({
  hero,
  accent = 'pink',
  sfx,
  height = 160,
  imageUrl,
}: CoverPlateProps) {
  return (
    <div
      className="ck-plate"
      style={{
        height,
        background: imageUrl ? 'var(--ink)' : risoColorVar(accent),
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <>
          <div className="ck-plate-skew" />
          {hero && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '52%',
                transform: 'translate(-50%,-50%)',
              }}
            >
              <HeroStamp hero={hero} size={Math.min(height * 0.65, 110)} />
            </div>
          )}
          {sfx && (
            <span
              className="ck-sfx"
              style={{
                position: 'absolute',
                top: 6,
                right: 10,
                fontSize: Math.min(height * 0.32, 38),
                color: 'var(--ink)',
                textShadow: '2px 2px 0 var(--riso-mustard)',
              }}
            >
              {sfx}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Back-compat shims so callers don't need to know the rename ---------- */

interface HeroPortraitProps {
  /** Hero id (e.g. "windman") or display name. */
  id: string;
  size?: number;
}

/** @deprecated Use HeroStamp directly. Kept so existing call sites still resolve. */
export function HeroPortrait({ id, size = 220 }: HeroPortraitProps) {
  const hero = HEROES.find((h) => h.id === id) ?? pickHeroByName(id);
  return <HeroStamp hero={hero} size={size} showCode={false} />;
}

/** @deprecated Use pickHeroByName(name).id. */
// eslint-disable-next-line react-refresh/only-export-components
export function pickHeroIdByName(name: string): string {
  return pickHeroByName(name).id;
}
