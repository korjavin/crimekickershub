import { useEffect, useState } from 'react';
import { getEntities, getEntityTypes } from '@/lib/api';
import type { Entity } from '@/lib/api-types';
import { HeroPortrait, pickHeroIdByName } from '@/components/wimpy/HeroPortrait';
import { HEROES, heroColorVar, heroFg } from '@/components/wimpy/data';
import type { WimpyHeroColor, WimpyHero } from '@/components/wimpy/data';

const COLOR_RING: WimpyHeroColor[] = ['blue', 'red', 'purple', 'yellow', 'green', 'orange'];
const TILTS = [-1.2, 1.4, -0.8, 1.0, -0.6, 1.2];

function colorFor(idx: number): WimpyHeroColor {
  return COLOR_RING[idx % COLOR_RING.length];
}

interface MergedHero {
  id: string | number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  avatar_thumbnail_url: string | null;
  type: string;
  color: WimpyHeroColor;
  portraitId: string;
  issue: string;
  designOnly?: WimpyHero;
}

function makeFallbackHeroes(): MergedHero[] {
  return HEROES.map((h) => ({
    id: h.id,
    name: h.name,
    description: h.tagline,
    avatar_url: null,
    avatar_thumbnail_url: null,
    type: 'hero',
    color: h.color,
    portraitId: h.id,
    issue: h.issue,
    designOnly: h,
  }));
}

function mergeWithLive(entities: Entity[]): MergedHero[] {
  return entities.map((e, i) => {
    const designMatch = HEROES.find((h) => h.name.toLowerCase() === e.name.toLowerCase());
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      avatar_url: e.avatar_url,
      avatar_thumbnail_url: e.avatar_thumbnail_url,
      type: e.type,
      color: designMatch?.color ?? colorFor(i),
      portraitId: pickHeroIdByName(e.name),
      issue: String(e.id).padStart(3, '0'),
      designOnly: designMatch,
    };
  });
}

export function WikiPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [types, setTypes] = useState<{ slug: string; name: string }[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<MergedHero | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getEntities().catch(() => []), getEntityTypes().catch(() => [])]).then(([e, t]) => {
      if (cancelled) return;
      setEntities(e ?? []);
      setTypes(t ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const baseList: MergedHero[] = entities.length > 0 ? mergeWithLive(entities) : makeFallbackHeroes();
  const filtered = filter === 'all' ? baseList : baseList.filter((e) => e.type.toLowerCase() === filter.toLowerCase());

  return (
    <div style={{ paddingBottom: 40 }}>
      {!selected && (
        <>
          <div style={{ padding: '32px 64px 14px' }}>
            <div className="wk-eyebrow" style={{ color: 'var(--marker-red)' }}>
              The roster · 4 kids · 4 weird powers
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 84,
                lineHeight: 0.95,
                textTransform: 'uppercase',
                margin: '6px 0 6px',
              }}
            >
              Meet the <span style={{ color: 'var(--marker-blue)' }}>HEROES</span>
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-hand)',
                fontSize: 19,
                color: 'var(--ink-2)',
                maxWidth: 720,
                lineHeight: 1.5,
              }}
            >
              Click a kid for their backstory, stats, and the absolutely-real powers they SWEAR they have.
            </p>
          </div>

          {types.length > 0 && (
            <div
              style={{
                padding: '0 64px 14px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <button
                className={`wk-checkbox-pill${filter === 'all' ? ' on' : ''}`}
                onClick={() => setFilter('all')}
              >
                <span className="wk-dot" />
                all
              </button>
              {types.map((t) => (
                <button
                  key={t.slug}
                  className={`wk-checkbox-pill${filter === t.slug ? ' on' : ''}`}
                  onClick={() => setFilter(t.slug)}
                >
                  <span className="wk-dot" />
                  {t.name}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 26,
              padding: '10px 64px',
            }}
          >
            {filtered.map((h, i) => (
              <HeroBigCard key={h.id} hero={h} tilt={TILTS[i % TILTS.length]} onClick={() => setSelected(h)} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: '40px 64px', textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: 'var(--font-hand)',
                  fontSize: 22,
                  color: 'var(--ink-3)',
                }}
              >
                Nobody here. Check another category!
              </p>
            </div>
          )}
        </>
      )}

      {selected && <HeroProfile hero={selected} onBack={() => setSelected(null)} />}
    </div>
  );
}

function HeroBigCard({ hero, tilt, onClick }: { hero: MergedHero; tilt: number; onClick: () => void }) {
  const bg = heroColorVar(hero.color);
  const fg = heroFg(hero.color);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="wk-card"
      style={{
        display: 'grid',
        gridTemplateColumns: '200px minmax(0, 1fr)',
        gap: 16,
        transform: `rotate(${tilt}deg)`,
        cursor: 'pointer',
      }}
    >
      <div
        className="wk-halftone"
        style={{
          background: bg,
          color: fg,
          border: '3px solid var(--ink-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 220,
          overflow: 'hidden',
        }}
      >
        {hero.avatar_url ? (
          <img
            src={hero.avatar_thumbnail_url || hero.avatar_url}
            alt={hero.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <HeroPortrait id={hero.portraitId} size={170} />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="wk-eyebrow" style={{ color: bg }}>
          Hero file · #{hero.issue}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 44,
            textTransform: 'uppercase',
            lineHeight: 0.95,
            margin: '2px 0 6px',
          }}
        >
          {hero.name}
        </div>
        {hero.designOnly && (
          <div style={{ fontFamily: 'var(--font-marker)', fontSize: 18, color: 'var(--ink-2)' }}>
            Power: {hero.designOnly.powerName}
          </div>
        )}
        <div
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: 16,
            color: 'var(--ink-2)',
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {hero.description ?? 'No file on this one yet.'}
        </div>
        {hero.designOnly && (
          <div style={{ marginTop: 10 }}>
            {hero.designOnly.tags.slice(0, 3).map((t) => (
              <span key={t} className="wk-pill" style={{ marginRight: 6 }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroProfile({ hero, onBack }: { hero: MergedHero; onBack: () => void }) {
  const design = hero.designOnly;
  return (
    <div
      style={{
        padding: '12px 64px',
        display: 'grid',
        gridTemplateColumns: '320px minmax(0, 1fr)',
        gap: 32,
      }}
    >
      <div>
        <button className="wk-btn sm ghost" onClick={onBack}>
          ← back to roster
        </button>
        <div
          style={{
            marginTop: 12,
            background: heroColorVar(hero.color),
            border: '5px solid var(--ink-1)',
            boxShadow: '8px 8px 0 var(--ink-1)',
            padding: 14,
            transform: 'rotate(-1.5deg)',
          }}
        >
          <div
            style={{
              background: '#fffaee',
              border: '3px solid var(--ink-1)',
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {hero.avatar_url ? (
              <img
                src={hero.avatar_url}
                alt={hero.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <HeroPortrait id={hero.portraitId} size={260} />
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-marker)',
              fontSize: 18,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {hero.name}
          </div>
        </div>

        {design && (
          <div style={{ marginTop: 18 }}>
            <div className="wk-eyebrow" style={{ marginBottom: 4 }}>
              Stats
            </div>
            {Object.entries(design.stats).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '2px dashed var(--ink-1)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-hand)' }}>{k}</span>
                <span>
                  {'★'.repeat(v)}
                  {'☆'.repeat(5 - v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="wk-eyebrow" style={{ color: 'var(--marker-red)' }}>
          Hero profile · #{hero.issue}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 88,
            lineHeight: 0.92,
            textTransform: 'uppercase',
            margin: '4px 0 10px',
            letterSpacing: '.02em',
          }}
        >
          {hero.name}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: 21,
            lineHeight: 1.5,
            color: 'var(--ink-2)',
            maxWidth: 600,
          }}
        >
          {design?.bio ?? hero.description ?? 'No bio yet. Check back after lunch.'}
        </p>

        {design && (
          <div style={{ marginTop: 14 }}>
            {design.tags.map((t) => (
              <span key={t} className="wk-pill" style={{ marginRight: 6, marginBottom: 6 }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {design && (
          <div style={{ marginTop: 22 }}>
            <div className="wk-eyebrow" style={{ marginBottom: 8 }}>
              Powers
            </div>
            <ul
              style={{
                fontFamily: 'var(--font-hand)',
                fontSize: 19,
                lineHeight: 1.7,
                paddingLeft: 18,
                margin: 0,
              }}
            >
              {design.powers.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
          <button className="wk-btn red">Add to my roster</button>
          <button className="wk-btn">Share to lockerwall</button>
        </div>
      </div>
    </div>
  );
}
