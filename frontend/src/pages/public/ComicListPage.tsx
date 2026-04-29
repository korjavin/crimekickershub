import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getStories } from '@/lib/api';
import type { Story } from '@/lib/api-types';
import { CoverPlate } from '@/components/wimpy/HeroPortrait';
import {
  HEROES,
  STORIES,
  accentForIndex,
  sfxForIndex,
} from '@/components/wimpy/data';
import type { Hero, RisoColor, StoryDesign } from '@/components/wimpy/data';

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
        toast.error('Failed to load dossiers. Please try again.');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '32px 64px 16px' }}>
        <div className="ck-eyebrow ck-eyebrow-strong">
          § 01 · Dossiers · {stories.length || STORIES.length} of 41 visible
        </div>
        <h1 className="ck-riso-h" data-shadow="The Vault" style={{ fontSize: 84, margin: '8px 0' }}>
          The Vault
        </h1>
      </div>

      {loading && (
        <div style={{ padding: '40px 64px', textAlign: 'center' }}>
          <span className="ck-eyebrow">Pulling files from the cabinet…</span>
        </div>
      )}

      {!loading && stories.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 22,
            padding: '0 64px',
          }}
        >
          {stories.map((s, i) => (
            <LiveDossierCard
              key={s.id}
              story={s}
              hero={HEROES[i % HEROES.length]}
              accent={accentForIndex(i)}
              sfx={sfxForIndex(i)}
            />
          ))}
        </div>
      )}

      {!loading && stories.length === 0 && (
        <>
          <div style={{ padding: '0 64px 16px' }}>
            <span className="ck-note">
              No live files yet — preview entries below for what the vault will hold.
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 22,
              padding: '0 64px',
            }}
          >
            {STORIES.map((s, i) => (
              <PreviewDossierCard
                key={s.id}
                story={s}
                hero={HEROES[i % HEROES.length]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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

function PreviewDossierCard({ story, hero }: { story: StoryDesign; hero: Hero }) {
  return (
    <div
      className="ck-card"
      style={{ padding: 0, opacity: 0.92, background: 'var(--paper-bright)' }}
    >
      <CardHeader code={story.code} accent={story.accent} />
      <CoverPlate hero={hero} accent={story.accent} sfx={story.sfx} height={180} />
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
    </div>
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
      <CoverPlate hero={hero} accent={accent} sfx={sfx} height={200} imageUrl={story.cover_image_url} />
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
