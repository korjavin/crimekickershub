import { useEffect, useState } from 'react';
import { getEntities, getEntityTypes } from '@/lib/api';
import type { Entity } from '@/lib/api-types';
import { HeroStamp } from '@/components/wimpy/HeroPortrait';
import { HEROES, pickHeroByName } from '@/components/wimpy/data';
import type { Hero } from '@/components/wimpy/data';

interface MergedSubject {
  id: string | number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  avatar_thumbnail_url: string | null;
  type: string;
  /** Hero design metadata (monogram / stats / bio) bound by name match. */
  design: Hero;
}

function makeFallbackSubjects(): MergedSubject[] {
  return HEROES.map((h) => ({
    id: h.id,
    name: h.name,
    description: h.tagline,
    avatar_url: null,
    avatar_thumbnail_url: null,
    type: 'hero',
    design: h,
  }));
}

function mergeWithLive(entities: Entity[]): MergedSubject[] {
  return entities.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    avatar_url: e.avatar_url,
    avatar_thumbnail_url: e.avatar_thumbnail_url,
    type: e.type,
    design: pickHeroByName(e.name),
  }));
}

export function WikiPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [types, setTypes] = useState<{ slug: string; name: string }[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<MergedSubject | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getEntities().catch(() => []), getEntityTypes().catch(() => [])]).then(
      ([e, t]) => {
        if (cancelled) return;
        setEntities(e ?? []);
        setTypes(t ?? []);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const baseList: MergedSubject[] =
    entities.length > 0 ? mergeWithLive(entities) : makeFallbackSubjects();
  const filtered =
    filter === 'all'
      ? baseList
      : baseList.filter((e) => e.type.toLowerCase() === filter.toLowerCase());

  return (
    <div style={{ paddingBottom: 40 }}>
      {!selected && (
        <>
          <div style={{ padding: '32px 64px 12px' }}>
            <div className="ck-eyebrow ck-eyebrow-strong">
              § 02 · Field guide · subjects 001–004
            </div>
            <h1 className="ck-riso-h" data-shadow="The roster" style={{ fontSize: 88, margin: '8px 0' }}>
              The roster
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 17,
                color: 'var(--ink-2)',
                maxWidth: 720,
                lineHeight: 1.55,
              }}
            >
              Four subjects under active observation. Click a card for the long-form file.
            </p>
          </div>

          {types.length > 0 && (
            <div style={{ padding: '0 64px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                className={`ck-chip${filter === 'all' ? ' on' : ''}`}
                onClick={() => setFilter('all')}
              >
                all
              </button>
              {types.map((t) => (
                <button
                  key={t.slug}
                  className={`ck-chip${filter === t.slug ? ' on' : ''}`}
                  onClick={() => setFilter(t.slug)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 22,
              padding: '10px 64px',
            }}
          >
            {filtered.map((s) => (
              <SubjectCard key={s.id} subject={s} onClick={() => setSelected(s)} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: '40px 64px', textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                }}
              >
                No subjects in this category.
              </p>
            </div>
          )}
        </>
      )}

      {selected && <SubjectProfile subject={selected} onBack={() => setSelected(null)} />}
    </div>
  );
}

function SubjectCard({
  subject,
  onClick,
}: {
  subject: MergedSubject;
  onClick: () => void;
}) {
  const { design } = subject;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="ck-card"
      style={{
        display: 'grid',
        gridTemplateColumns: '180px minmax(0, 1fr)',
        gap: 18,
        cursor: 'pointer',
        background: 'var(--paper-bright)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--paper-2)',
          border: '2px solid var(--ink)',
          height: 200,
          overflow: 'hidden',
        }}
      >
        {subject.avatar_url ? (
          <img
            src={subject.avatar_thumbnail_url || subject.avatar_url}
            alt={subject.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <HeroStamp hero={design} size={130} />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="ck-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          SUBJECT {design.code}
        </div>
        <div className="ck-dpy" style={{ fontSize: 38, lineHeight: 1 }}>
          {subject.name}
        </div>
        <div
          className="ck-mono"
          style={{ fontSize: 13, color: 'var(--riso-blue)', margin: '6px 0' }}
        >
          {design.powerName}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-2)' }}>
          {subject.description ?? design.tagline}
        </div>
        <div style={{ marginTop: 10 }}>
          {design.tags.slice(0, 3).map((t) => (
            <span key={t} className="ck-pill" style={{ marginRight: 6 }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubjectProfile({
  subject,
  onBack,
}: {
  subject: MergedSubject;
  onBack: () => void;
}) {
  const { design } = subject;
  return (
    <div
      style={{
        padding: '12px 64px',
        display: 'grid',
        gridTemplateColumns: '300px minmax(0, 1fr)',
        gap: 32,
      }}
    >
      <div>
        <button className="ck-btn ghost sm" onClick={onBack}>
          ← roster
        </button>
        <div
          className="ck-card color-shadow"
          style={{ marginTop: 12, padding: 18, background: 'var(--paper-bright)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            {subject.avatar_url ? (
              <div
                style={{
                  width: 200,
                  height: 200,
                  border: '3px solid var(--ink)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={subject.avatar_url}
                  alt={subject.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <HeroStamp hero={design} size={180} />
            )}
          </div>
          <div
            className="ck-mono"
            style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}
          >
            SUBJECT {design.code}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="ck-eyebrow">Stat ratings</div>
          {Object.entries(design.stats).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px dashed var(--ink-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
              }}
            >
              <span>{k.toUpperCase()}</span>
              <span>
                {Array.from({ length: 5 })
                  .map((_, i) => (i < v ? '■' : '□'))
                  .join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="ck-eyebrow ck-eyebrow-strong">Subject {design.code} · Field profile</div>
        <h1
          className="ck-riso-h"
          data-shadow={subject.name}
          style={{ fontSize: 88, margin: '6px 0 6px' }}
        >
          {subject.name}
        </h1>
        <div className="ck-mono" style={{ fontSize: 14, color: 'var(--riso-blue)' }}>
          {design.powerName}
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            maxWidth: 600,
            marginTop: 14,
          }}
        >
          {subject.description ?? design.bio}
        </p>

        <div style={{ marginTop: 14 }}>
          {design.tags.map((t) => (
            <span key={t} className="ck-pill" style={{ marginRight: 6, marginBottom: 6 }}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <div className="ck-eyebrow">Capabilities</div>
          <ul
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              lineHeight: 1.7,
              paddingLeft: 18,
              margin: '8px 0 0',
            }}
          >
            {design.powers.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
          <button className="ck-btn pink">Save subject</button>
          <button className="ck-btn ghost">Print field card</button>
        </div>
      </div>
    </div>
  );
}
