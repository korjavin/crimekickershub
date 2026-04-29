import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStories, getHeroes } from '@/lib/api';
import type { Story, Entity } from '@/lib/api-types';
import { HeroPortrait, pickHeroIdByName } from '@/components/wimpy/HeroPortrait';
import { HEROES, STORIES, VIDEOS, heroColorVar, heroFg } from '@/components/wimpy/data';
import type { WimpyHeroColor } from '@/components/wimpy/data';

const SFX_BY_COVER: Record<string, string> = {
  windy: 'WHOOSH!',
  soup: 'SLURP!',
  size: 'STOMP!',
  dim: 'ZAP!',
  spoon: 'CLINK!',
  rad: 'BRRR!',
};

const TILTS = [-1.2, 1.4, -0.6, 1.2];

export function HomePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [heroes, setHeroes] = useState<Entity[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStories().catch(() => []), getHeroes().catch(() => [])]).then(([s, h]) => {
      if (cancelled) return;
      setStories(s ?? []);
      setHeroes(h ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = STORIES[0];
  const liveStories = stories.slice(0, 3);
  const liveHeroes = heroes.slice(0, 4);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Hero */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)',
          gap: 32,
          padding: '40px 64px 24px',
        }}
      >
        <div>
          <div className="wk-eyebrow" style={{ color: 'var(--marker-red)', marginBottom: 4 }}>
            ★ NEW ISSUE · #{featured.issue}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 92,
              lineHeight: 0.92,
              margin: '0 0 14px',
              textTransform: 'uppercase',
              letterSpacing: '.02em',
            }}
          >
            Crime
            <br />
            Kickers
            <br />
            <span style={{ color: 'var(--marker-red)' }}>UNITE</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-hand)',
              fontSize: 22,
              lineHeight: 1.45,
              maxWidth: 520,
              color: 'var(--ink-2)',
              marginBottom: 22,
            }}
          >
            Four kids. Four weird powers. One school cafeteria full of crime. Read the comics, watch the
            clips, learn the lore — or whatever.
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to={liveStories[0]?.slug ? `/comics/${liveStories[0].slug}` : '/comics'} className="wk-btn red">
              Read issue #{featured.issue}
            </Link>
            <Link to="/wiki" className="wk-btn">
              Meet the heroes →
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <FeaturedPolaroid />
        </div>
      </section>

      {/* Latest comics */}
      <SectionHead title="Latest comics" cta="See all →" toCta="/comics" accent="red" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 22,
          padding: '0 64px',
        }}
      >
        {liveStories.length > 0
          ? liveStories.map((s, i) => <LiveComicCard key={s.id} story={s} tilt={TILTS[i]} />)
          : STORIES.slice(0, 3).map((s) => <ComicCard key={s.id} story={s} />)}
      </div>

      {/* Hero roster */}
      <SectionHead title="Hero roster" cta="All heroes →" toCta="/wiki" accent="blue" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 18,
          padding: '0 64px',
        }}
      >
        {liveHeroes.length > 0
          ? liveHeroes.map((h, i) => <LiveHeroCard key={h.id} hero={h} tilt={TILTS[i % TILTS.length]} />)
          : HEROES.map((h, i) => <HeroCardSmall key={h.id} hero={h} tilt={TILTS[i]} />)}
      </div>

      {/* Cinema teaser */}
      <SectionHead title="From the cinema" cta="Watch all →" toCta="/cinema" accent="green" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 22,
          padding: '0 64px 40px',
        }}
      >
        {VIDEOS.slice(0, 3).map((v, i) => (
          <VideoTile key={v.id} video={v} tilt={[-1, 1.2, -0.5][i]} />
        ))}
      </div>
    </div>
  );
}

function FeaturedPolaroid() {
  return (
    <div
      style={{
        background: '#fffaee',
        border: '4px solid var(--ink-1)',
        boxShadow: '10px 10px 0 var(--ink-1)',
        padding: 12,
        transform: 'rotate(2.5deg)',
        width: 360,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -16,
          left: '50%',
          width: 110,
          height: 24,
          background: 'rgba(255,226,89,.85)',
          border: '1px dashed rgba(28,26,22,.35)',
          transform: 'translateX(-50%) rotate(-4deg)',
        }}
      />
      <div
        style={{
          background: 'var(--paper-manila)',
          border: '3px solid var(--ink-1)',
          height: 280,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <HeroPortrait id="phoboman" size={200} />
        <span className="wk-sfx" style={{ position: 'absolute', top: 10, right: 8, fontSize: 56 }}>
          POW!
        </span>
        <span
          className="wk-sfx"
          style={{ position: 'absolute', bottom: 10, left: 8, fontSize: 44, color: 'var(--marker-blue)' }}
        >
          WHOOSH!
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-marker)',
          fontSize: 18,
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        "The mall was a MISTAKE."
      </div>
    </div>
  );
}

function SectionHead({
  title,
  cta,
  toCta,
  accent = 'yellow',
}: {
  title: string;
  cta: string;
  toCta: string;
  accent?: WimpyHeroColor;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        padding: '32px 64px 14px',
      }}
    >
      <h2
        className="wk-crayon-underline"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 40,
          textTransform: 'uppercase',
          letterSpacing: '.03em',
          margin: 0,
        }}
      >
        {title}
      </h2>
      <Link
        to={toCta}
        className="wk-eyebrow"
        style={{
          marginLeft: 'auto',
          color: heroColorVar(accent),
          textDecoration: 'none',
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

function ComicCard({ story }: { story: (typeof STORIES)[number] }) {
  const accent = heroColorVar(story.accent);
  const fg = heroFg(story.accent);
  return (
    <Link
      to="/comics"
      className="wk-card"
      style={{ transform: `rotate(${story.tilt}deg)`, textDecoration: 'none', display: 'block' }}
    >
      <div
        className="wk-halftone"
        style={{
          background: accent,
          color: fg,
          height: 130,
          border: '3px solid var(--ink-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 60, letterSpacing: '.04em' }}>
          #{story.issue}
        </div>
        <span
          className="wk-sfx"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: 28,
            color: 'var(--ink-1)',
            textShadow: '2px 2px 0 var(--paper-cream)',
          }}
        >
          {SFX_BY_COVER[story.cover]}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-marker)', fontSize: 22, lineHeight: 1.1, marginTop: 8 }}>
        {story.title}
      </div>
      <div style={{ fontFamily: 'var(--font-hand)', fontSize: 16, color: 'var(--ink-2)' }}>
        {story.blurb}
      </div>
    </Link>
  );
}

function LiveComicCard({ story, tilt }: { story: Story; tilt: number }) {
  // map a SFX based on title length
  const sfxs = Object.values(SFX_BY_COVER);
  const sfx = sfxs[story.id % sfxs.length];
  const accents: WimpyHeroColor[] = ['yellow', 'red', 'blue', 'green', 'purple'];
  const accent = accents[story.id % accents.length];
  const accentBg = heroColorVar(accent);
  const fg = heroFg(accent);
  const issue = String(story.id).padStart(3, '0');
  return (
    <Link
      to={`/comics/${story.slug}`}
      className="wk-card"
      style={{ transform: `rotate(${tilt}deg)`, textDecoration: 'none', display: 'block' }}
    >
      <div
        className="wk-halftone"
        style={{
          background: accentBg,
          color: fg,
          height: 130,
          border: '3px solid var(--ink-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {story.cover_image_url ? (
          <img
            src={story.cover_image_url}
            alt={story.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 60, letterSpacing: '.04em' }}>
            #{issue}
          </div>
        )}
        <span
          className="wk-sfx"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: 28,
            color: 'var(--ink-1)',
            textShadow: '2px 2px 0 var(--paper-cream)',
          }}
        >
          {sfx}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-marker)', fontSize: 22, lineHeight: 1.1, marginTop: 8 }}>
        {story.title}
      </div>
      <div style={{ fontFamily: 'var(--font-hand)', fontSize: 16, color: 'var(--ink-2)' }}>
        {story.published ? 'New issue, hot off the printer.' : 'Coming soon — Greg is still inking.'}
      </div>
    </Link>
  );
}

function HeroCardSmall({ hero, tilt }: { hero: (typeof HEROES)[number]; tilt: number }) {
  const bg = heroColorVar(hero.color);
  const fg = heroFg(hero.color);
  return (
    <Link
      to="/wiki"
      className="wk-card"
      style={{
        background: bg,
        color: fg,
        transform: `rotate(${tilt}deg)`,
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div
        style={{
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fffaee',
          border: '3px solid var(--ink-1)',
        }}
      >
        <HeroPortrait id={hero.id} size={130} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          letterSpacing: '.03em',
          textTransform: 'uppercase',
          lineHeight: 1.05,
          marginTop: 10,
        }}
      >
        {hero.name}
      </div>
      <div style={{ fontFamily: 'var(--font-hand)', fontSize: 14, opacity: 0.95 }}>{hero.tagline}</div>
    </Link>
  );
}

function LiveHeroCard({ hero, tilt }: { hero: Entity; tilt: number }) {
  const colors: WimpyHeroColor[] = ['blue', 'red', 'purple', 'yellow', 'green', 'orange'];
  const color = colors[hero.id % colors.length];
  const bg = heroColorVar(color);
  const fg = heroFg(color);
  const portraitId = pickHeroIdByName(hero.name);
  return (
    <Link
      to="/wiki"
      className="wk-card"
      style={{
        background: bg,
        color: fg,
        transform: `rotate(${tilt}deg)`,
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div
        style={{
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fffaee',
          border: '3px solid var(--ink-1)',
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
          <HeroPortrait id={portraitId} size={130} />
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          letterSpacing: '.03em',
          textTransform: 'uppercase',
          lineHeight: 1.05,
          marginTop: 10,
        }}
      >
        {hero.name}
      </div>
      <div style={{ fontFamily: 'var(--font-hand)', fontSize: 14, opacity: 0.95 }}>
        {hero.description?.slice(0, 60) ?? 'Powers tba. Stay tuned.'}
      </div>
    </Link>
  );
}

function VideoTile({ video, tilt }: { video: (typeof VIDEOS)[number]; tilt: number }) {
  const bg = heroColorVar(video.color);
  return (
    <Link to="/cinema" className="wk-card" style={{ transform: `rotate(${tilt}deg)`, textDecoration: 'none', display: 'block' }}>
      <div
        className="wk-halftone"
        style={{
          height: 140,
          background: bg,
          border: '3px solid var(--ink-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '30px solid var(--ink-1)',
            borderTop: '20px solid transparent',
            borderBottom: '20px solid transparent',
            marginLeft: 8,
          }}
        />
        <span
          className="wk-pill"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'var(--ink-1)',
            color: 'var(--paper-cream)',
            borderColor: 'var(--paper-cream)',
          }}
        >
          {video.tag}
        </span>
        <span
          className="wk-pill"
          style={{ position: 'absolute', bottom: 8, right: 8, background: 'var(--paper-cream)' }}
        >
          {video.mins}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-marker)', fontSize: 20, marginTop: 8 }}>{video.title}</div>
    </Link>
  );
}
