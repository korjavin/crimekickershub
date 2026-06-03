import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStories, getHeroes, getVideos, type Video } from '@/lib/api';
import type { Story, Entity } from '@/lib/api-types';
import { HeroStamp, CoverPlate } from '@/components/wimpy/HeroPortrait';
import {
  HEROES,
  STORIES,
  VIDEOS,
  accentForIndex,
  pickHeroByName,
  risoColorVar,
  sfxForIndex,
} from '@/components/wimpy/data';
import type { Hero, RisoColor, StoryDesign } from '@/components/wimpy/data';

export function HomePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [heroes, setHeroes] = useState<Entity[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStories().catch(() => []),
      getHeroes().catch(() => []),
      getVideos().catch(() => []),
    ]).then(([s, h, v]) => {
      if (cancelled) return;
      setStories(s ?? []);
      setHeroes(h ?? []);
      setVideos(v ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = STORIES[0];
  const liveStories = stories.slice(0, 3);
  const liveHeroes = heroes.slice(0, 4);
  const featuredHero = HEROES[1]; // pho-boman, matches the SLURP cover

  const featuredHref =
    liveStories[0]?.slug ? `/comics/${liveStories[0].slug}` : '/comics';

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Masthead */}
      <section className="ck-page-x" style={{ padding: '36px clamp(16px, 5vw, 64px) 8px' }}>
        <div className="ck-eyebrow ck-eyebrow-strong">
          Vol. 04 · Index · Cleared for distribution
        </div>
        <h1
          className="ck-riso-h ck-h-mast"
          data-shadow="Crime Kickers"
          style={{ margin: '10px 0 6px' }}
        >
          Crime Kickers
        </h1>
        <div
          className="ck-dpy"
          style={{ fontSize: 'clamp(18px, 3vw, 26px)', color: 'var(--riso-blue)', marginTop: -4 }}
        >
          A field manual / Issue forty-one
        </div>
      </section>
      <hr className="ck-divider-double" style={{ marginLeft: 'clamp(16px, 5vw, 64px)', marginRight: 'clamp(16px, 5vw, 64px)' }} />

      {/* Feature row */}
      <section
        className="ck-grid ck-grid-feature ck-page-x"
        style={{ gap: 30, paddingTop: 0, paddingBottom: 30 }}
      >
        <div>
          <div className="ck-eyebrow">Lead dossier</div>
          <h2 className="ck-dpy ck-h-display" style={{ margin: '6px 0 14px' }}>
            Four kids.
            <br />
            One <span className="ck-hl-pink">cafeteria.</span>
            <br />
            Ongoing problem.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              lineHeight: 1.55,
              maxWidth: 540,
              color: 'var(--ink-2)',
            }}
          >
            Each issue is a case file. Each case file is a small disaster. Read the dossiers, study the
            field guide, watch the surveillance reels — proceed at your own risk.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <Link to={featuredHref} className="ck-btn pink">
              Open dossier {featured.code}
            </Link>
            <Link to="/wiki" className="ck-btn ghost">
              Field guide →
            </Link>
          </div>
          <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="ck-note pink">"do NOT show this to mr. pierce"</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <FeaturedFile story={featured} hero={featuredHero} />
        </div>
      </section>

      {/* Latest dossiers */}
      <SectionHead num="01" title="Latest dossiers" cta="See all →" toCta="/comics" />
      <div className="ck-grid ck-grid-3 ck-page-x">
        {liveStories.length > 0
          ? liveStories.map((s, i) => (
              <LiveDossierCard
                key={s.id}
                story={s}
                hero={HEROES[i % HEROES.length]}
                accent={accentForIndex(i)}
                sfx={sfxForIndex(i)}
              />
            ))
          : STORIES.slice(0, 3).map((s, i) => (
              <DossierCard key={s.id} story={s} hero={HEROES[i % HEROES.length]} />
            ))}
      </div>

      {/* Field guide */}
      <SectionHead num="02" title="Field guide" cta="All entries →" toCta="/wiki" />
      <div className="ck-grid ck-grid-4 ck-page-x" style={{ gap: 18 }}>
        {liveHeroes.length > 0
          ? liveHeroes.map((h) => <LiveHeroIndexCard key={h.id} entity={h} />)
          : HEROES.map((h) => <HeroIndexCard key={h.id} hero={h} />)}
      </div>

      {/* Reels */}
      <SectionHead num="03" title="Surveillance reels" cta="Watch all →" toCta="/cinema" />
      <div className="ck-grid ck-grid-3 ck-page-x" style={{ paddingBottom: 40 }}>
        {(videos.length > 0 ? videos : VIDEOS).slice(0, 3).map((v) => (
          <ReelCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}

function SectionHead({
  num,
  title,
  cta,
  toCta,
}: {
  num: string;
  title: string;
  cta: string;
  toCta: string;
}) {
  return (
    <div
      className="ck-page-x"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        padding: '32px clamp(16px, 5vw, 64px) 14px',
        flexWrap: 'wrap',
      }}
    >
      <span className="ck-mono" style={{ fontSize: 14, color: 'var(--riso-pink)' }}>
        § {num}
      </span>
      <h2 className="ck-dpy" style={{ fontSize: 'clamp(22px, 4.5vw, 32px)', margin: 0 }}>
        {title}
      </h2>
      <div
        style={{
          flex: 1,
          borderBottom: '2px dashed var(--ink-3)',
          height: 1,
          marginBottom: 6,
        }}
      />
      <Link
        to={toCta}
        className="ck-mono"
        style={{ fontSize: 13, textDecoration: 'none', color: 'var(--riso-blue)' }}
      >
        {cta}
      </Link>
    </div>
  );
}

function FeaturedFile({ story, hero }: { story: StoryDesign; hero: Hero }) {
  return (
    <div
      className="ck-card color-shadow ck-feature-file"
      style={{ padding: 0, background: 'var(--paper-bright)' }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '2px solid var(--ink)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="ck-mono" style={{ fontSize: 11 }}>FILE / {story.code}</span>
        <span className="ck-pill ink">CLASSIFIED</span>
      </div>
      <CoverPlate hero={hero} accent={story.accent} sfx={story.sfx} height={260} />
      <div style={{ padding: 14 }}>
        <div className="ck-dpy" style={{ fontSize: 28, lineHeight: 1 }}>
          {story.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--ink-3)',
            marginTop: 6,
          }}
        >
          filed 04:11 PM · {story.sfx}
        </div>
      </div>
    </div>
  );
}

function DossierCard({ story, hero }: { story: StoryDesign; hero: Hero }) {
  return (
    <Link
      to="/comics"
      className="ck-card"
      style={{ padding: 0, textDecoration: 'none', display: 'block' }}
    >
      <CardHeader code={story.code} accent={story.accent} />
      <CoverPlate hero={hero} accent={story.accent} sfx={story.sfx} height={150} />
      <div style={{ padding: 12 }}>
        <div className="ck-dpy" style={{ fontSize: 22, lineHeight: 1 }}>
          {story.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--ink-2)',
            marginTop: 6,
          }}
        >
          {story.blurb}
        </div>
      </div>
    </Link>
  );
}

function LiveDossierCard({
  story,
  hero,
  accent,
  sfx,
}: {
  story: Story;
  hero: Hero;
  accent: RisoColor;
  sfx: string;
}) {
  const code = `C-${String(story.id).padStart(3, '0')}`;
  return (
    <Link
      to={`/comics/${story.slug}`}
      className="ck-card"
      style={{ padding: 0, textDecoration: 'none', display: 'block' }}
    >
      <CardHeader code={code} accent={accent} />
      <CoverPlate hero={hero} accent={accent} sfx={sfx} height={150} imageUrl={story.cover_image_url} />
      <div style={{ padding: 12 }}>
        <div className="ck-dpy" style={{ fontSize: 22, lineHeight: 1 }}>
          {story.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--ink-2)',
            marginTop: 6,
          }}
        >
          {story.published ? 'Cleared for distribution.' : 'Pending redaction review.'}
        </div>
      </div>
    </Link>
  );
}

function CardHeader({ code, accent }: { code: string; accent: RisoColor }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderBottom: '2px solid var(--ink)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span className="ck-mono" style={{ fontSize: 11 }}>FILE / {code}</span>
      <span className={`ck-pill ${accent}`}>{accent}</span>
    </div>
  );
}

function HeroIndexCard({ hero }: { hero: Hero }) {
  return (
    <Link
      to="/wiki"
      className="ck-card"
      style={{ textDecoration: 'none', display: 'block', background: 'var(--paper-bright)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 18px' }}>
        <HeroStamp hero={hero} size={100} />
      </div>
      <div className="ck-dpy" style={{ fontSize: 22, marginTop: 10 }}>
        {hero.name}
      </div>
      <div
        className="ck-mono"
        style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 6px' }}
      >
        {hero.powerName}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-2)' }}>
        {hero.tagline}
      </div>
    </Link>
  );
}

function LiveHeroIndexCard({ entity }: { entity: Entity }) {
  const hero = pickHeroByName(entity.name);
  return (
    <Link
      to="/wiki"
      className="ck-card"
      style={{ textDecoration: 'none', display: 'block', background: 'var(--paper-bright)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 18px' }}>
        {entity.avatar_url ? (
          <div
            style={{
              width: 100,
              height: 100,
              border: '3px solid var(--ink)',
              overflow: 'hidden',
            }}
          >
            <img
              src={entity.avatar_thumbnail_url || entity.avatar_url}
              alt={entity.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <HeroStamp hero={hero} size={100} />
        )}
      </div>
      <div className="ck-dpy" style={{ fontSize: 22, marginTop: 10 }}>
        {entity.name}
      </div>
      <div
        className="ck-mono"
        style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 6px' }}
      >
        {hero.powerName}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-2)' }}>
        {entity.description?.slice(0, 80) ?? hero.tagline}
      </div>
    </Link>
  );
}

function ReelCard({
  video,
}: {
  video: { id: number | string; title: string; color: string; tag: string; mins: string };
}) {
  return (
    <Link
      to="/cinema"
      className="ck-card"
      style={{ padding: 0, textDecoration: 'none', display: 'block' }}
    >
      <div
        className="ck-plate"
        style={{
          height: 140,
          background: risoColorVar(video.color as RisoColor),
          borderBottom: '2px solid var(--ink)',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderImage: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '30px solid var(--ink)',
              borderTop: '20px solid transparent',
              borderBottom: '20px solid transparent',
            }}
          />
        </div>
        <span className="ck-pill ink" style={{ position: 'absolute', top: 8, left: 8 }}>
          {video.tag}
        </span>
        <span className="ck-pill" style={{ position: 'absolute', bottom: 8, right: 8 }}>
          {video.mins}
        </span>
      </div>
      <div style={{ padding: 12 }}>
        <div className="ck-dpy" style={{ fontSize: 20 }}>
          {video.title}
        </div>
      </div>
    </Link>
  );
}
