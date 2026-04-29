import { Outlet, NavLink, Link } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/comics', label: 'Comics' },
  { to: '/wiki', label: 'Wiki' },
  { to: '/cinema', label: 'Cinema' },
];

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col wk-paper">
      <nav className="wk-topnav">
        <Link to="/" className="wk-brand">Crime Kickers</Link>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `wk-navlink${isActive ? ' on' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: 'var(--font-scribble)',
            color: 'var(--marker-yellow)',
            fontSize: 16,
            transform: 'rotate(-3deg)',
            display: 'inline-block',
          }}
        >
          NEW issue!!
        </span>
        <Link to="/login" className="wk-btn red sm" style={{ transform: 'rotate(0)' }}>
          Sign in
        </Link>
      </nav>
      <main className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>
      <footer
        style={{
          padding: '16px 22px',
          fontFamily: 'var(--font-hand-sc)',
          fontSize: 13,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          textAlign: 'center',
          borderTop: '2px dashed var(--ink-1)',
          background: 'transparent',
          position: 'relative',
          zIndex: 1,
        }}
      >
        © Crime Kickers Hub · all four heroes reserved
      </footer>
    </div>
  );
}
