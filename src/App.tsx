import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { SpeciesProfileProvider } from './components/species/SpeciesProfileProvider';
import { HomePage } from './pages/HomePage';
import { AtlasPage } from './pages/AtlasPage';
import { SpeciesPage } from './pages/SpeciesPage';
import { ComparePage } from './pages/ComparePage';
import { ConservationPage } from './pages/ConservationPage';
import { AboutPage } from './pages/AboutPage';
import { SourcesPage } from './pages/SourcesPage';
import { NotFoundPage } from './pages/NotFoundPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SpeciesProfileProvider>
        <ScrollToTop />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-md focus:bg-forest-500 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main id="main" className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/atlas" element={<AtlasPage />} />
              <Route path="/species" element={<SpeciesPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/conservation" element={<ConservationPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SpeciesProfileProvider>
    </BrowserRouter>
  );
}
