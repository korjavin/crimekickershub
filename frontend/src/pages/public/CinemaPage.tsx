import { useState } from 'react';
import { VIDEOS, heroColorVar } from '@/components/wimpy/data';
import type { WimpyVideo } from '@/components/wimpy/data';
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '@/lib/api';

export function CinemaPage() {
  const [activeId, setActiveId] = useState<string>(VIDEOS[0].id);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const allTags = Array.from(new Set(VIDEOS.flatMap((v) => v.tags)));
  const filtered = VIDEOS.filter((v) => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
    const matchTag = !tagFilter || v.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const active: WimpyVideo = VIDEOS.find((v) => v.id === activeId) ?? VIDEOS[0];

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '32px 64px 8px' }}>
        <div className="wk-eyebrow" style={{ color: 'var(--marker-red)' }}>
          Trailers · clips · ALL the soup
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 78,
            lineHeight: 0.95,
            textTransform: 'uppercase',
            margin: '6px 0 6px',
          }}
        >
          The <span style={{ color: 'var(--marker-red)' }}>cinema</span>
        </h1>
      </div>

      <div
        style={{
          padding: '0 64px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <input
          className="wk-field"
          placeholder="Search the reel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <button
          className={`wk-checkbox-pill${tagFilter === null ? ' on' : ''}`}
          onClick={() => setTagFilter(null)}
        >
          <span className="wk-dot" /> all
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            className={`wk-checkbox-pill${tagFilter === tag ? ' on' : ''}`}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
          >
            <span className="wk-dot" /> {tag}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: '0 64px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'start',
        }}
      >
        <div>
          <div
            className="wk-halftone"
            style={{
              background: 'var(--ink-1)',
              border: '5px solid var(--ink-1)',
              boxShadow: '8px 8px 0 var(--marker-yellow)',
              aspectRatio: '16 / 9',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {playing ? (
              <iframe
                title={active.title}
                src={getYouTubeEmbedUrl(active.youtube_id)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src={getYouTubeThumbnail(active.youtube_id)}
                  alt={active.title}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.85,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: heroColorVar(active.color),
                    opacity: 0.35,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label={`Play ${active.title}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '60px solid var(--paper-cream)',
                      borderTop: '40px solid transparent',
                      borderBottom: '40px solid transparent',
                      filter: 'drop-shadow(4px 4px 0 var(--ink-1))',
                    }}
                  />
                </button>
                <span
                  className="wk-pill"
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: 'var(--ink-1)',
                    color: 'var(--paper-cream)',
                    borderColor: 'var(--paper-cream)',
                  }}
                >
                  {active.tag}
                </span>
                <span
                  className="wk-pill"
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    background: 'var(--paper-cream)',
                  }}
                >
                  {active.mins}
                </span>
              </>
            )}
          </div>
          <h2 style={{ fontFamily: 'var(--font-marker)', fontSize: 32, marginTop: 14 }}>{active.title}</h2>
          <p
            style={{
              fontFamily: 'var(--font-hand)',
              fontSize: 18,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
            }}
          >
            {active.description}
          </p>
          <div style={{ marginTop: 6 }}>
            {active.tags.map((t) => (
              <span key={t} className="wk-pill" style={{ marginRight: 6 }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: 560, overflow: 'auto' }}>
          <div className="wk-eyebrow" style={{ marginBottom: 8 }}>
            Up next
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((vv, i) => (
              <button
                key={vv.id}
                type="button"
                onClick={() => {
                  setActiveId(vv.id);
                  setPlaying(false);
                }}
                className="wk-card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px minmax(0, 1fr)',
                  gap: 12,
                  padding: 8,
                  transform: `rotate(${i % 2 ? 0.4 : -0.6}deg)`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow:
                    vv.id === activeId
                      ? '5px 5px 0 var(--marker-red)'
                      : '5px 5px 0 var(--ink-1)',
                  background: '#fffaee',
                }}
              >
                <div
                  style={{
                    background: heroColorVar(vv.color),
                    border: '2px solid var(--ink-1)',
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '16px solid var(--ink-1)',
                      borderTop: '10px solid transparent',
                      borderBottom: '10px solid transparent',
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-marker)', fontSize: 17, lineHeight: 1.1 }}>
                    {vv.title}
                  </div>
                  <div className="wk-eyebrow" style={{ fontSize: 11, marginTop: 4 }}>
                    {vv.tag} · {vv.mins}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div
                style={{
                  fontFamily: 'var(--font-hand)',
                  color: 'var(--ink-3)',
                  padding: '12px 4px',
                }}
              >
                Nothing matches. Try clearing the filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
