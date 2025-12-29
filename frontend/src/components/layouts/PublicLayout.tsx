import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export function PublicLayout() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b p-4">
        <div className="container mx-auto flex gap-4 items-center">
          <Link to="/" className="font-bold">Crime Kickers Hub</Link>
          <Link to="/wiki" className="text-sm hover:text-primary">Wiki</Link>
          <Link to="/comics" className="text-sm hover:text-primary">Comics</Link>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '🌞' : '🌙'}
            </Button>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        © 2024 Crime Kickers Hub
      </footer>
    </div>
  );
}
