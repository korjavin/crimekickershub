import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/prompts', label: 'Prompt Studio', icon: '🎨' },
  { path: '/admin/media', label: 'Media Assets', icon: '🖼️' },
  { path: '/admin/stories', label: 'Story Builder', icon: '📚' },
  { path: '/admin/entities', label: 'Entities', icon: '👤' },
];

export function AdminLayout() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-4 bg-muted/30">
        <h2 className="font-bold mb-4 text-lg">Admin Panel</h2>
        <nav className="space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`block p-2 rounded transition-colors ${
                location.pathname === item.path 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 pt-4 border-t">
          <Link 
            to="/" 
            className="block p-2 rounded text-sm hover:bg-muted"
          >
            ← Back to Public Site
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div className="mb-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
