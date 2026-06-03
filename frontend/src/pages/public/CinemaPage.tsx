import { useState, useEffect } from 'react';
import { risoColorVar } from '@/components/wimpy/data';
import type { RisoColor } from '@/components/wimpy/data';
import { getVideos, getYouTubeEmbedUrl, getYouTubeThumbnail, type Video } from '@/lib/api';

// Videos are managed via the admin panel (/admin/videos) and served from /api/videos.
const colorVar = (c: string) => risoColorVar(c as RisoColor);

export function CinemaPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    getVideos()
      .then((data) => {
        const list = data || [];
        setVideos(list);
        if (list.length > 0) setActiveId(list[0].id);
      })
      .catch((err) => console.error('Failed to load videos:', err))
      .finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(videos.flatMap((v) => v.tags)));
  const filtered = videos.filter((v) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
    const matchTag = !tagFilter || v.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const active: Video | undefined = videos.find((v) => v.id === activeId) ?? videos[0];

  const Header = (
    <div className="ck-page-x" style={{ padding: '32px clamp(16px, 5vw, 64px) 8px' }}>
      <div className="ck-eyebrow ck-eyebrow-strong">§ 03 · Surveillance reels</div>
      <h1 className="ck-riso-h ck-h-section" data-shadow="The Reels" style={{ margin: '8px 0' }}>
        The Reels
      </h1>
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
          Loading the reels…
        </div>
      </div>
    );
  }

  if (!active) {
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
          No reels yet. Check back soon.
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
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
          placeholder="Search the reel…"
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

      <div
        className="ck-grid ck-grid-cinema ck-page-x"
        style={{ gap: 28, alignItems: 'start' }}
      >
        <div>
          <div
            style={{
              background: 'var(--ink)',
              border: '2px solid var(--ink)',
              boxShadow: '8px 8px 0 var(--riso-pink)',
              aspectRatio: '16 / 9',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {playing ? (
              <iframe
                title={active.title}
                src={getYouTubeEmbedUrl(active.youtube_id)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
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
                    background: colorVar(active.color),
                    opacity: 0.45,
                    mixBlendMode: 'multiply',
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
                      borderLeft: '60px solid var(--paper-bright)',
                      borderTop: '40px solid transparent',
                      borderBottom: '40px solid transparent',
                      filter: 'drop-shadow(4px 4px 0 var(--ink))',
                    }}
                  />
                </button>
                {active.tag && (
                  <span
                    className="ck-pill ink"
                    style={{ position: 'absolute', top: 12, left: 12 }}
                  >
                    {active.tag}
                  </span>
                )}
                {active.mins && (
                  <span className="ck-pill" style={{ position: 'absolute', bottom: 12, right: 12 }}>
                    {active.mins}
                  </span>
                )}
              </>
            )}
          </div>
          <h2 className="ck-dpy" style={{ fontSize: 'clamp(22px, 4vw, 30px)', marginTop: 14 }}>
            {active.title}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
            }}
          >
            {active.description}
          </p>
          <div style={{ marginTop: 6 }}>
            {active.tags.map((t) => (
              <span key={t} className="ck-pill" style={{ marginRight: 6 }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="ck-scroll" style={{ maxHeight: 560 }}>
          <div className="ck-eyebrow">Up next</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {filtered.map((vv) => (
              <button
                key={vv.id}
                type="button"
                onClick={() => {
                  setActiveId(vv.id);
                  setPlaying(false);
                }}
                className="ck-card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px minmax(0, 1fr)',
                  gap: 12,
                  padding: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow:
                    vv.id === activeId
                      ? '5px 5px 0 var(--riso-pink)'
                      : '5px 5px 0 var(--ink)',
                  background: 'var(--paper-bright)',
                }}
              >
                <div
                  style={{
                    background: colorVar(vv.color),
                    border: '2px solid var(--ink)',
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '16px solid var(--ink)',
                      borderTop: '10px solid transparent',
                      borderBottom: '10px solid transparent',
                    }}
                  />
                </div>
                <div>
                  <div className="ck-dpy" style={{ fontSize: 16 }}>
                    {vv.title}
                  </div>
                  <div
                    className="ck-mono"
                    style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}
                  >
                    {vv.tag} · {vv.mins}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  padding: '12px 4px',
                }}
              >
                Nothing matches. Clear the filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
