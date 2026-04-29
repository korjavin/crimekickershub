import { Outlet, NavLink, Link } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Index', end: true },
  { to: '/comics', label: 'Dossiers' },
  { to: '/wiki', label: 'Field Guide' },
  { to: '/cinema', label: 'Reels' },
];

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col ck-paper">
      <nav className="ck-topnav">
        <Link to="/" className="ck-brand">
          <span className="ck-brand-stamp">CK</span>
          Crime Kickers
        </Link>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `ck-navlink${isActive ? ' on' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
        <span className="ck-nav-right">
          <span
            className="ck-mono"
            style={{ fontSize: 12, color: 'var(--ink-3)' }}
          >
            VOL.04 · ISSUE 41
          </span>
          <Link to="/login" className="ck-btn pink sm">
            Sign in
          </Link>
        </span>
      </nav>
      <main className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>
      <footer
        style={{
          padding: '18px 22px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          textAlign: 'center',
          borderTop: '4px double var(--ink)',
          background: 'var(--paper-bright)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        © Crime Kickers Hub · Field Manual edition · cleared for distribution
      </footer>
    </div>
  );
}
