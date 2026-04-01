import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BookOpen, Home, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import FactoryWorkspace from './pages/FactoryWorkspace';
import Reader from './pages/Reader';
import NovelDetail from './pages/NovelDetail';
import SettingsPage, { applyTheme } from './pages/Settings';
import './index.css';

function App() {
  // Apply saved theme on load
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'eclipse';
    applyTheme(saved);
  }, []);

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header className="app-header">
          <Link to="/" className="app-header-brand">
            <BookOpen color="var(--accent-color)" size={22} />
            <span>Light Novel Studio</span>
          </Link>
          <nav className="app-header-nav">
            <Link to="/" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
              <Home size={18} /> <span className="nav-label">Início</span>
            </Link>
            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
            <Link to="/settings" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
              <Settings size={18} /> <span className="nav-label">Configurações</span>
            </Link>
          </nav>
        </header>

        <main style={{ flex: 1, padding: '2rem 0' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/novel/:id" element={<NovelDetail />} />
            <Route path="/novel/:id/factory" element={<FactoryWorkspace />} />
            <Route path="/novel/:id/read" element={<Reader />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
