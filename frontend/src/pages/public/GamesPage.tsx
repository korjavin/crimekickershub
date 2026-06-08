import { useEffect, useState } from 'react';
import { risoColorVar, risoFg } from '@/components/wimpy/data';
import type { RisoColor } from '@/components/wimpy/data';
import { getGames, type Game } from '@/lib/api';

// Games are managed via the admin panel (/admin/games) and served from /api/games.
// Each tile is slightly rotated and stamped on the page like a comic panel pinned
// to a corkboard. Clicking the tile opens the external game URL in a new tab.

const FALLBACK_COLORS: RisoColor[] = ['pink', 'blue', 'mustard', 'violet', 'teal', 'coral'];

const colorVar = (c: string, fallback: RisoColor): string => {
  if (!c) return risoColorVar(fallback);
  return risoColorVar(c as RisoColor);
};

const fgColor = (c: string, fallback: RisoColor): string => {
  const key = (c || fallback) as RisoColor;
  return risoFg(key);
};

// Deterministic pseudo-random rotation/offset based on id so tiles stay put on re-render.
const tiltFor = (id: number): { rotate: number; nudgeX: number; nudgeY: number } => {
  const seed = id * 9301 + 49297;
  const r1 = (seed % 233280) / 233280;
  const r2 = ((seed * 2) % 233280) / 233280;
  const r3 = ((seed * 3) % 233280) / 233280;
  // Tilt between roughly -4° and +4°, plus a small pixel nudge.
  return {
    rotate: (r1 - 0.5) * 8,
    nudgeX: (r2 - 0.5) * 6,
    nudgeY: (r3 - 0.5) * 6,
  };
};

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    getGames()
      .then((data) => setGames(data || []))
      .catch((err) => console.error('Failed to load games:', err))
      .finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(games.map((g) => g.tag).filter(Boolean)));

  const filtered = games.filter((g) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
    const matchTag = !tagFilter || g.tag === tagFilter;
    return matchSearch && matchTag;
  });

  const Header = (
    <div className="ck-page-x" style={{ padding: '32px clamp(16px, 5vw, 64px) 8px' }}>
      <div className="ck-eyebrow ck-eyebrow-strong">§ 04 · Arcade dossier</div>
      <h1 className="ck-riso-h ck-h-section" data-shadow="Games" style={{ margin: '8px 0' }}>
        Games
      </h1>
      <p
        className="ck-mono"
        style={{
          fontSize: 13,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          maxWidth: 560,
          marginTop: 6,
        }}
      >
        Pinned to the corkboard. Tap a card to play it on the host site.
      </p>
    </div>
  );

  if (loading) {
    return (
      <div style={{ paddingBottom: 40 }}>
        {Header}
        <div
          className="ck-page-x ck-mono"
          style={{
            fontSize: 13,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            padding: '24px 4px',
          }}
        >
          Loading the arcade…
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {Header}

      <div
        className="ck-page-x"
        style={{
          paddingBottom: 14,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <input
          className="ck-field"
          placeholder="Search the arcade…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <button
          className={`ck-chip${tagFilter === null ? ' on' : ''}`}
          onClick={() => setTagFilter(null)}
        >
          all
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            className={`ck-chip${tagFilter === tag ? ' on' : ''}`}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          className="ck-page-x ck-mono"
          style={{
            fontSize: 13,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            padding: '24px 4px',
          }}
        >
          {games.length === 0 ? 'No games yet. Check back soon.' : 'Nothing matches. Clear the filter.'}
        </div>
      ) : (
        <div
          className="ck-page-x"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '36px 28px',
            paddingTop: 18,
            paddingBottom: 18,
          }}
        >
          {filtered.map((g, idx) => {
            const tilt = tiltFor(g.id);
            const fallbackColor = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
            const accent = colorVar(g.color, fallbackColor);
            const fg = fgColor(g.color, fallbackColor);

            return (
              <a
                key={g.id}
                href={g.url}
                target="_blank"
                rel="noreferrer noopener"
                className="ck-game-tile"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'var(--ink)',
                  background: 'var(--paper-bright)',
                  border: '2px solid var(--ink)',
                  boxShadow: `8px 8px 0 ${accent}`,
                  padding: 0,
                  transform: `translate(${tilt.nudgeX}px, ${tilt.nudgeY}px) rotate(${tilt.rotate}deg)`,
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = `translate(${tilt.nudgeX - 2}px, ${tilt.nudgeY - 2}px) rotate(${tilt.rotate}deg)`;
                  e.currentTarget.style.boxShadow = `10px 10px 0 ${accent}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = `translate(${tilt.nudgeX}px, ${tilt.nudgeY}px) rotate(${tilt.rotate}deg)`;
                  e.currentTarget.style.boxShadow = `8px 8px 0 ${accent}`;
                }}
              >
                {/* tape strip */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-4deg)',
                    width: 70,
                    height: 18,
                    background: 'rgba(255, 235, 120, 0.72)',
                    border: '1px solid rgba(0,0,0,.12)',
                    boxShadow: '1px 1px 0 rgba(0,0,0,.08)',
                    pointerEvents: 'none',
                  }}
                />

                <div
                  style={{
                    aspectRatio: '4 / 3',
                    background: accent,
                    borderBottom: '2px solid var(--ink)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {g.thumbnail_url ? (
                    <>
                      <img
                        src={g.thumbnail_url}
                        alt={g.title}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: accent,
                          opacity: 0.28,
                          mixBlendMode: 'multiply',
                        }}
                      />
                    </>
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-display)',
                        textTransform: 'uppercase',
                        fontSize: 'clamp(28px, 5vw, 44px)',
                        letterSpacing: '-.02em',
                        color: fg,
                        textShadow: '3px 3px 0 var(--ink)',
                        padding: 18,
                        textAlign: 'center',
                        lineHeight: 0.95,
                      }}
                    >
                      {g.title}
                    </div>
                  )}

                  {g.tag && (
                    <span
                      className="ck-pill ink"
                      style={{ position: 'absolute', top: 10, left: 10 }}
                    >
                      {g.tag}
                    </span>
                  )}
                  <span
                    className="ck-pill"
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      background: 'var(--paper-bright)',
                      color: 'var(--ink)',
                    }}
                  >
                    PLAY ▸
                  </span>
                </div>

                <div style={{ padding: '14px 16px 18px' }}>
                  <div
                    className="ck-dpy"
                    style={{
                      fontSize: 'clamp(18px, 2.4vw, 22px)',
                      lineHeight: 1.05,
                      marginBottom: 6,
                    }}
                  >
                    {g.title}
                  </div>
                  {g.description && (
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 14,
                        color: 'var(--ink-2)',
                        lineHeight: 1.45,
                        margin: 0,
                      }}
                    >
                      {g.description}
                    </p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
