import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLayout } from './components/layouts/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<div className="p-4"><h1 className="text-2xl font-bold">Welcome to Crime Kickers Hub</h1></div>} />
          <Route path="/wiki" element={<div className="p-4"><h1 className="text-2xl font-bold">Hero Wiki</h1></div>} />
          <Route path="/comics" element={<div className="p-4"><h1 className="text-2xl font-bold">Comic Reader</h1></div>} />
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<div className="p-4"><h1 className="text-2xl font-bold">Dashboard</h1></div>} />
          <Route path="/admin/prompts" element={<div className="p-4"><h1 className="text-2xl font-bold">Prompt Studio</h1></div>} />
          <Route path="/admin/media" element={<div className="p-4"><h1 className="text-2xl font-bold">Media Assets</h1></div>} />
          <Route path="/admin/stories" element={<div className="p-4"><h1 className="text-2xl font-bold">Story Builder</h1></div>} />
          <Route path="/admin/entities" element={<div className="p-4"><h1 className="text-2xl font-bold">Entities</h1></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
