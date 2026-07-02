import { useEffect, useRef, useState } from 'react';
import { risoColorVar, risoFg } from '@/components/wimpy/data';
import type { RisoColor } from '@/components/wimpy/data';
import { getMerch, wantMerch, type Merch } from '@/lib/api';

const FALLBACK_COLORS: RisoColor[] = ['pink', 'blue', 'mustard', 'violet', 'teal', 'coral'];

const colorVar = (c: string, fallback: RisoColor): string =>
  risoColorVar((c || fallback) as RisoColor);

const fgColor = (c: string, fallback: RisoColor): string =>
  risoFg((c || fallback) as RisoColor);

const tiltFor = (id: number) => {
  const seed = id * 9301 + 49297;
  const r1 = (seed % 233280) / 233280;
  const r2 = ((seed * 2) % 233280) / 233280;
  const r3 = ((seed * 3) % 233280) / 233280;
  return { rotate: (r1 - 0.5) * 8, nudgeX: (r2 - 0.5) * 6, nudgeY: (r3 - 0.5) * 6 };
};

const LS_KEY = (id: number) => `ck-merch-want-${id}`;

function PromoBanner({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--paper-bright)',
          border: '3px solid var(--ink)',
          boxShadow: '8px 8px 0 var(--riso-pink)',
          maxWidth: 480,
          width: '100%',
          padding: '32px 28px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ck-eyebrow ck-eyebrow-strong" style={{ marginBottom: 12 }}>
          § Merch · in the works
        </div>
        <h2
          className="ck-dpy"
          style={{ fontSize: 'clamp(22px, 4vw, 32px)', lineHeight: 1.1, marginBottom: 16 }}
        >
          Your vote is in!
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', marginBottom: 8 }}>
          This section is still in the demand-research stage. We're not selling yet —
          we're finding out what Crime Kickers fans want to see.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', marginBottom: 24 }}>
          Thanks — your vote helps us plan production. The more interest, the sooner
          this becomes real.
        </p>
        <button className="ck-btn pink" onClick={onClose} style={{ width: '100%' }}>
          Got it · close
        </button>
      </div>
    </div>
  );
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.85)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        cursor: 'zoom-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--paper-bright)',
          border: '4px solid var(--ink)',
          boxShadow: '12px 12px 0 var(--riso-pink)',
          padding: 12,
          maxWidth: '95vw',
          maxHeight: '95vh',
          display: 'flex',
        }}
      >
        <img
          src={src}
          alt="Enlarged merch view"
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(95vh - 24px)',
            objectFit: 'contain',
            border: '2px solid var(--ink)',
          }}
        />
      </div>
    </div>
  );
}

export function MerchPage() {
  const [items, setItems] = useState<Merch[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // ponytail: localStorage guard only, no server dedup — add per-IP/fingerprint throttle only if spam becomes real
  const [voted, setVoted] = useState<Set<number>>(() => {
    const s = new Set<number>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('ck-merch-want-')) s.add(Number(k.slice(14)));
      }
    } catch {
      // storage blocked (private mode etc.) — votes just won't persist across reloads
    }
    return s;
  });
  const [counts, setCounts] = useState<Record<number, number>>({});
  // synchronous in-flight guard: two rapid clicks share the same `voted` closure, so the ref closes the race the state can't
  const inFlight = useRef<Set<number>>(new Set());

  useEffect(() => {
    getMerch()
      .then((data) => {
        const d = data || [];
        setItems(d);
        setCounts(Object.fromEntries(d.map((m) => [m.id, m.want_count])));
      })
      .catch((err) => console.error('Failed to load merch:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleWant = async (id: number) => {
    if (voted.has(id) || inFlight.current.has(id)) return;
    inFlight.current.add(id);
    try {
      const res = await wantMerch(id);
      setVoted((prev) => new Set(prev).add(id));
      setCounts((prev) => ({ ...prev, [id]: res.want_count }));
      setBannerVisible(true);
      try {
        localStorage.setItem(LS_KEY(id), '1');
      } catch {
        // storage blocked — in-memory voted still guards this session
      }
    } catch (err) {
      console.error('Failed to record want:', err);
    } finally {
      inFlight.current.delete(id);
    }
  };

  const Header = (
    <div className="ck-page-x" style={{ padding: '32px clamp(16px, 5vw, 64px) 8px' }}>
      <div className="ck-eyebrow ck-eyebrow-strong">§ 05 · Merch</div>
      <h1 className="ck-riso-h ck-h-section" data-shadow="Merch" style={{ margin: '8px 0' }}>
        Merch
      </h1>
      <p
        className="ck-mono"
        style={{
          fontSize: 13,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          maxWidth: 560,
          marginTop: 6,
        }}
      >
        Section in the works · vote for what you want to see
      </p>
    </div>
  );

  if (loading) {
    return (
      <div style={{ paddingBottom: 40 }}>
        {Header}
        <div
          className="ck-page-x ck-mono"
          style={{ fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', padding: '24px 4px' }}
        >
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {previewImage && <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />}
      {bannerVisible && <PromoBanner onClose={() => setBannerVisible(false)} />}
      {Header}

      {items.length === 0 ? (
        <div
          className="ck-page-x ck-mono"
          style={{ fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', padding: '24px 4px' }}
        >
          Nothing here yet. Check back soon.
        </div>
      ) : (
        <div
          className="ck-page-x"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '36px 28px',
            paddingTop: 18,
            paddingBottom: 18,
          }}
        >
          {items.map((m, idx) => {
            const tilt = tiltFor(m.id);
            const fallbackColor = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
            const accent = colorVar(m.color, fallbackColor);
            const fg = fgColor(m.color, fallbackColor);
            const hasVoted = voted.has(m.id);
            const count = counts[m.id] ?? m.want_count;

            return (
              <div
                key={m.id}
                className="ck-game-tile"
                style={{
                  display: 'block',
                  background: 'var(--paper-bright)',
                  border: '2px solid var(--ink)',
                  boxShadow: `8px 8px 0 ${accent}`,
                  padding: 0,
                  transform: `translate(${tilt.nudgeX}px, ${tilt.nudgeY}px) rotate(${tilt.rotate}deg)`,
                  position: 'relative',
                }}
              >
                {/* tape strip */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-4deg)',
                    width: 70,
                    height: 18,
                    background: 'rgba(255, 235, 120, 0.72)',
                    border: '1px solid rgba(0,0,0,.12)',
                    boxShadow: '1px 1px 0 rgba(0,0,0,.08)',
                    pointerEvents: 'none',
                  }}
                />

                <div
                  style={{
                    aspectRatio: '4 / 3',
                    background: accent,
                    borderBottom: '2px solid var(--ink)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {m.thumbnail_url ? (
                    <>
                      <img
                        src={m.thumbnail_url}
                        alt={m.title}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        onClick={() => setPreviewImage(m.image_url || m.thumbnail_url)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: accent,
                          opacity: 0.28,
                          mixBlendMode: 'multiply',
                          cursor: 'zoom-in',
                        }}
                      />
                    </>
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-display)',
                        textTransform: 'uppercase',
                        fontSize: 'clamp(28px, 5vw, 44px)',
                        letterSpacing: '-.02em',
                        color: fg,
                        textShadow: '3px 3px 0 var(--ink)',
                        padding: 18,
                        textAlign: 'center',
                        lineHeight: 0.95,
                      }}
                    >
                      {m.title}
                    </div>
                  )}

                  {m.tag && (
                    <span className="ck-pill ink" style={{ position: 'absolute', top: 10, left: 10 }}>
                      {m.tag}
                    </span>
                  )}
                  {count > 0 && (
                    <span
                      className="ck-pill"
                      style={{ position: 'absolute', bottom: 10, right: 10, background: 'var(--paper-bright)', color: 'var(--ink)' }}
                    >
                      {count} want this
                    </span>
                  )}
                </div>

                <div style={{ padding: '14px 16px 18px' }}>
                  <div className="ck-dpy" style={{ fontSize: 'clamp(18px, 2.4vw, 22px)', lineHeight: 1.05, marginBottom: 6 }}>
                    {m.title}
                  </div>
                  {m.description && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45, margin: '0 0 12px' }}>
                      {m.description}
                    </p>
                  )}
                  <button
                    className={`ck-btn${hasVoted ? '' : ' pink'}`}
                    style={{ width: '100%', opacity: hasVoted ? 0.55 : 1, cursor: hasVoted ? 'default' : 'pointer' }}
                    disabled={hasVoted}
                    onClick={() => handleWant(m.id)}
                  >
                    {hasVoted ? 'Voted ✓' : 'I want it!'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
