import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </StrictMode>
);

function SettingsPage() {
  return (
    <div className="h-full flex items-center justify-center bg-[var(--color-background)]">
      <div className="text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-lg font-semibold">Настройки</h2>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-2">Раздел в разработке</p>
      </div>
    </div>
  );
}
