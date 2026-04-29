import type { PublicStoryItem } from '@/lib/api-types';
import ReactMarkdown from 'react-markdown';

interface ComicReaderProps {
  items: PublicStoryItem[];
}

const SHADOW_RING = [
  '8px 8px 0 var(--ink)',
  '8px 8px 0 var(--riso-pink)',
  '8px 8px 0 var(--riso-blue)',
  '8px 8px 0 var(--riso-mustard)',
];

export const ComicReader = ({ items }: ComicReaderProps) => {
  return (
    <div
      className="ck-paper-bright"
      style={{
        width: '100%',
        maxWidth: 760,
        margin: '0 auto',
        padding: '24px 16px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: 36,
      }}
    >
      {items.map((item, index) => {
        const shadow = SHADOW_RING[index % SHADOW_RING.length];

        return (
          <div
            key={index}
            style={{
              position: 'relative',
              border: '2px solid var(--ink)',
              background: 'var(--paper-bright)',
              boxShadow: shadow,
              overflow: 'hidden',
              backgroundImage:
                'radial-gradient(rgba(31,29,24,.10) 1.2px, transparent 1.4px)',
              backgroundSize: '6px 6px',
            }}
          >
            {item.type === 'image' && item.url && (
              <img
                src={item.url}
                alt={`Panel ${index + 1}`}
                style={{ width: '100%', display: 'block' }}
                loading="lazy"
              />
            )}

            {item.type === 'video' && item.youtube_id && (
              <div style={{ width: '100%', position: 'relative', paddingTop: '56.25%' }}>
                <iframe
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  src={`https://www.youtube.com/embed/${item.youtube_id}?mute=1`}
                  title={`Video Panel ${index + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {item.type === 'text' && (
              <div
                style={{
                  padding: '32px 28px',
                  minHeight: 240,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--ink)',
                  background: 'var(--paper-bright)',
                  position: 'relative',
                }}
              >
                {item.title && (
                  <div className="ck-eyebrow ck-eyebrow-strong" style={{ marginBottom: 8 }}>
                    {item.title}
                  </div>
                )}
                <div className="ck-prose" style={{ fontSize: 17, lineHeight: 1.6 }}>
                  <ReactMarkdown
                    components={{
                      p: ({ ...props }) => (
                        <p style={{ margin: '0 0 12px', color: 'var(--ink-2)' }} {...props} />
                      ),
                      strong: ({ ...props }) => (
                        <strong style={{ color: 'var(--ink)' }} {...props} />
                      ),
                      em: ({ ...props }) => (
                        <em style={{ color: 'var(--ink-2)' }} {...props} />
                      ),
                      h1: ({ ...props }) => (
                        <h3
                          className="ck-dpy"
                          style={{ fontSize: 28, margin: '4px 0 10px' }}
                          {...props}
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h4
                          className="ck-dpy"
                          style={{ fontSize: 22, margin: '4px 0 8px', color: 'var(--ink-2)' }}
                          {...props}
                        />
                      ),
                      blockquote: ({ ...props }) => (
                        <blockquote
                          style={{
                            borderLeft: '3px solid var(--riso-pink)',
                            paddingLeft: 12,
                            margin: '12px 0',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--ink-2)',
                          }}
                          {...props}
                        />
                      ),
                    }}
                  >
                    {item.text_content || ''}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'var(--ink)',
                color: 'var(--paper-bright)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '.14em',
                padding: '2px 8px',
              }}
            >
              PG / {String(index + 1).padStart(2, '0')}
            </div>
          </div>
        );
      })}

      <div
        className="ck-mono"
        style={{
          textAlign: 'center',
          marginTop: 12,
          fontSize: 13,
          letterSpacing: '.18em',
          color: 'var(--ink-3)',
        }}
      >
        — END OF FILE —
      </div>
    </div>
  );
};
