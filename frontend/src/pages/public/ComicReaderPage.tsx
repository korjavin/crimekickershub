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
          toast.error('Failed to load story. Please try again.');
          setError('Failed to load story');
          setLoading(false);
        });
    }
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: '60px 64px', textAlign: 'center' }}>
        <span className="wk-eyebrow">Pulling the issue off the shelf...</span>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div style={{ padding: '60px 64px', textAlign: 'center' }}>
        <div
          className="wk-sticky"
          style={{ display: 'inline-block', transform: 'rotate(-1.5deg)', marginBottom: 18 }}
        >
          {error || 'We looked everywhere. This issue is not real.'}
        </div>
        <div>
          <Link to="/comics" className="wk-btn red">
            ← back to the vault
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: '16px 64px 0',
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
        }}
      >
        <Link to="/comics" className="wk-btn sm ghost">
          ← all comics
        </Link>
        <span className="wk-eyebrow">Issue · {story.title}</span>
      </div>

      <div style={{ padding: '8px 64px 0' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 48,
            textTransform: 'uppercase',
            margin: '8px 0 14px',
            letterSpacing: '.02em',
          }}
        >
          {story.title}
        </h2>
      </div>

      <div style={{ padding: '0 32px 40px' }}>
        <ComicReader items={story.items} />
      </div>
    </div>
  );
};
