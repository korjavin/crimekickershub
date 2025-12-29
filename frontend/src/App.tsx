import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { RequireAuth } from './components/RequireAuth';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/public/HomePage';
import { WikiPage } from './pages/public/WikiPage';
import { ComicReaderPage, ComicListPage } from './pages/public/ComicReaderPage';
import { CinemaPage } from './pages/public/CinemaPage';
import { LoginPage } from './pages/auth/LoginPage';
import { PromptStudioPage } from './pages/admin/PromptStudioPage';
import { MediaPage } from './pages/admin/MediaPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/wiki" element={<WikiPage />} />
            <Route path="/comics" element={<ComicListPage />} />
            <Route path="/comics/:slug" element={<ComicReaderPage />} />
            <Route path="/cinema" element={<CinemaPage />} />
          </Route>

          {/* Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes (protected) */}
          <Route
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route path="/admin" element={<div className="p-4"><h1 className="text-2xl font-bold">Dashboard</h1></div>} />
            <Route path="/admin/prompts" element={<PromptStudioPage />} />
            <Route path="/admin/media" element={<MediaPage />} />
            <Route path="/admin/stories" element={<div className="p-4"><h1 className="text-2xl font-bold">Story Builder</h1></div>} />
            <Route path="/admin/entities" element={<div className="p-4"><h1 className="text-2xl font-bold">Entities</h1></div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
