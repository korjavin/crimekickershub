import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getStoryBySlug } from '@/lib/api';
import { ComicReader } from '@/components/ComicReader';
import type { PublicStory } from '@/lib/api-types';

export const ComicReaderPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<PublicStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      getStoryBySlug(slug)
        .then((data) => {
          setStory(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to open dossier. Please try again.');
          setError('Failed to load dossier');
          setLoading(false);
        });
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="ck-page-x" style={{ padding: '60px clamp(16px, 5vw, 64px)', textAlign: 'center' }}>
        <span className="ck-eyebrow">Pulling file from the cabinet…</span>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="ck-page-x" style={{ padding: '60px clamp(16px, 5vw, 64px)', textAlign: 'center' }}>
        <div style={{ marginBottom: 18 }}>
          <span className="ck-note pink">{error || 'No such file in the vault.'}</span>
        </div>
        <div>
          <Link to="/comics" className="ck-btn pink">
            ← back to the vault
          </Link>
        </div>
      </div>
    );
  }

  const code = slug ? `C-${slug.toUpperCase()}` : 'C-???';

  return (
    <div>
      <div
        className="ck-page-x"
        style={{
          padding: '16px clamp(16px, 5vw, 64px) 0',
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <Link to="/comics" className="ck-btn ghost sm">
          ← vault
        </Link>
        <span className="ck-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          FILE / {code}
        </span>
      </div>

      <div className="ck-page-x" style={{ paddingTop: 8 }}>
        <div className="ck-eyebrow ck-eyebrow-strong">Dossier</div>
        <h2
          className="ck-riso-h ck-h-display"
          data-shadow={story.title}
          style={{ margin: '6px 0 14px' }}
        >
          {story.title}
        </h2>
      </div>

      <div style={{ padding: '0 clamp(8px, 3vw, 32px) 40px' }}>
        <ComicReader items={story.items} />
      </div>
    </div>
  );
};
