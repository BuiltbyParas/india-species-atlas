import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { SpeciesProfileProvider } from './components/species/SpeciesProfileProvider';
import { CustomCursor } from './components/cinema/CustomCursor';
import { Loader, shouldShowLoader } from './components/cinema/Loader';
import { SmoothScroll } from './motion/SmoothScroll';
import { markIntroDone } from './motion/intro';
import { HomePage } from './pages/HomePage';

// The working pages are split out, so the documentary's first load carries
// only what it shows.
const AtlasPage = lazy(() => import('./pages/AtlasPage').then((m) => ({ default: m.AtlasPage })));
const SpeciesPage = lazy(() => import('./pages/SpeciesPage').then((m) => ({ default: m.SpeciesPage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })));
const ConservationPage = lazy(() => import('./pages/ConservationPage').then((m) => ({ default: m.ConservationPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const SourcesPage = lazy(() => import('./pages/SourcesPage').then((m) => ({ default: m.SourcesPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const DocumentaryPage = lazy(() => import('./pages/DocumentaryPage').then((m) => ({ default: m.DocumentaryPage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function PageFallback() {
  return <div className="min-h-[70vh]" aria-busy="true" />;
}

function Shell() {
  const { pathname } = useLocation();
  const home = pathname === '/';
  const documentary = pathname === '/documentary';
  const [loading, setLoading] = useState(() => home && shouldShowLoader());
  const done = useCallback(() => setLoading(false), []);

  useEffect(() => {
    if (!loading) markIntroDone();
  }, [loading]);

  if (documentary) {
    return (
      <Suspense fallback={<PageFallback />}>
        <DocumentaryPage />
      </Suspense>
    );
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:bg-canvas focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      {home && <SmoothScroll />}
      <CustomCursor />
      {loading && <Loader onDone={done} />}
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main id="main" className="flex-1">
          <Suspense fallback={<PageFallback />}>
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
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SpeciesProfileProvider>
        <ScrollToTop />
        <Shell />
      </SpeciesProfileProvider>
    </BrowserRouter>
  );
}
