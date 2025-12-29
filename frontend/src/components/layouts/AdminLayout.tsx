import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/matrix', label: 'Prompt Matrix', icon: '🔲' },
  { path: '/admin/prompts', label: 'Prompt Studio', icon: '🎨' },
  { path: '/admin/types', label: 'Prompt Types', icon: '📝' },
  { path: '/admin/media', label: 'Media Assets', icon: '🖼️' },
  { path: '/admin/stories', label: 'Story Builder', icon: '📚' },
  { path: '/admin/entities', label: 'Entities', icon: '👤' },
];

export function AdminLayout() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 border-r bg-muted/30 p-4
        transform transition-transform duration-200 ease-in-out
        lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Admin Panel</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </Button>
        </div>

        {/* User info */}
        {user && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
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

        <div className="mt-8 pt-4 border-t space-y-2">
          <Link
            to="/"
            className="block p-2 rounded text-sm hover:bg-muted"
            onClick={() => setSidebarOpen(false)}
          >
            ← Back to Public Site
          </Link>
          <button
            onClick={logout}
            className="w-full block p-2 rounded text-sm text-left hover:bg-muted text-destructive"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden border-b p-4 flex items-center justify-between bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </Button>
          <span className="font-semibold">Admin Panel</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </Button>
        </header>

        {/* Desktop toolbar */}
        <div className="hidden lg:flex justify-end p-4 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </Button>
        </div>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
