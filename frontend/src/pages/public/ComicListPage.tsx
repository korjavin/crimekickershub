import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getStories } from '@/lib/api';
import type { Story } from '@/lib/api-types';
import { STORIES, heroColorVar, heroFg } from '@/components/wimpy/data';
import type { WimpyHeroColor } from '@/components/wimpy/data';

const SFX_BY_COVER: Record<string, string> = {
  windy: 'WHOOSH!',
  soup: 'SLURP!',
  size: 'STOMP!',
  dim: 'ZAP!',
  spoon: 'CLINK!',
  rad: 'BRRR!',
};

const ACCENTS: WimpyHeroColor[] = ['yellow', 'red', 'blue', 'green', 'purple'];
const TILTS = [-1.2, 1.4, -0.6, 1.0, -0.9, 1.6];

export const ComicListPage = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStories()
      .then((data) => {
        setStories(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load comics. Please try again.');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '32px 64px 16px' }}>
        <div className="wk-eyebrow" style={{ color: 'var(--marker-red)' }}>
          All issues · ranked by chaos
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 78,
            lineHeight: 0.95,
            textTransform: 'uppercase',
            margin: '6px 0 8px',
          }}
        >
          The Comic <span style={{ color: 'var(--marker-red)' }}>vault</span>
        </h1>
      </div>

      {loading && (
        <div style={{ padding: '40px 64px', textAlign: 'center' }}>
          <span className="wk-eyebrow">Loading comics from the printing press...</span>
        </div>
      )}

      {!loading && stories.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 24,
            padding: '0 64px',
          }}
        >
          {stories.map((s, i) => (
            <LiveComicCard
              key={s.id}
              story={s}
              tilt={TILTS[i % TILTS.length]}
              accent={ACCENTS[i % ACCENTS.length]}
              sfx={Object.values(SFX_BY_COVER)[i % 6]}
            />
          ))}
        </div>
      )}

      {!loading && stories.length === 0 && (
        <>
          <div style={{ padding: '0 64px 16px' }}>
            <div
              className="wk-sticky"
              style={{ transform: 'rotate(-1.5deg)', marginBottom: 18 }}
            >
              No issues live yet — here's what the vault looks like once it fills up:
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 24,
              padding: '0 64px',
            }}
          >
            {STORIES.map((s) => (
              <PreviewComicCard key={s.id} story={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function PreviewComicCard({ story }: { story: (typeof STORIES)[number] }) {
  const accentBg = heroColorVar(story.accent);
  const fg = heroFg(story.accent);
  return (
    <div
      className="wk-card"
      style={{ transform: `rotate(${story.tilt}deg)`, opacity: 0.85 }}
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
    </div>
  );
}

function LiveComicCard({
  story,
  tilt,
  accent,
  sfx,
}: {
  story: Story;
  tilt: number;
  accent: WimpyHeroColor;
  sfx: string;
}) {
  const accentBg = heroColorVar(accent);
  const fg = heroFg(accent);
  const issue = String(story.id).padStart(3, '0');
  return (
    <Link
      to={`/comics/${story.slug}`}
      className="wk-card"
      style={{
        transform: `rotate(${tilt}deg)`,
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div
        className="wk-halftone"
        style={{
          background: accentBg,
          color: fg,
          height: 200,
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
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 80, letterSpacing: '.04em' }}>
            #{issue}
          </div>
        )}
        <span
          className="wk-sfx"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: 32,
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
        {story.published ? 'Live in the vault.' : 'Still inking — peek inside.'}
      </div>
    </Link>
  );
}
