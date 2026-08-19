import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CatalogProvider } from './lib/catalog-context'
import { CompetitorsPage } from './pages/Competitors'
import { CompetitorDetailPage } from './pages/CompetitorDetail'
import { CompetitorEditorPage } from './pages/CompetitorEditor'
import { DashboardPage } from './pages/Dashboard'
import { FeedPage } from './pages/Feed'
import { SourcesPage } from './pages/Sources'

export default function App() {
  return (
    <CatalogProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/competitors" element={<CompetitorsPage />} />
          <Route path="/competitors/new" element={<CompetitorEditorPage />} />
          <Route path="/competitors/:id/edit" element={<CompetitorEditorPage />} />
          <Route path="/competitors/:id" element={<CompetitorDetailPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </CatalogProvider>
  )
}
