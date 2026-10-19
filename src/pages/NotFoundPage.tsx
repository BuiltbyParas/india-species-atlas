import { Link } from 'react-router-dom';
import { LineTitle } from '../components/cinema/LineTitle';
import { EmptySheet } from '../components/ui/EmptySheet';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-8 lg:py-28" data-trail>
      <EmptySheet
        as="h1"
        eyebrow="404 · Not on the sheet"
        title={<LineTitle text="Page not found" />}
        actions={
          <>
            <Link to="/atlas" className="cta" data-magnetic="0.25" data-cursor="Enter">
              <span>Explore the map</span>
              <svg viewBox="0 0 40 10" aria-hidden="true" className="cta-line">
                <path d="M0 5 C 12 1, 26 9, 40 5" />
              </svg>
            </Link>
            <Link to="/" className="text-link" data-magnetic="0.2">
              Back to the documentary
            </Link>
          </>
        }
      >
        That address isn&rsquo;t part of the atlas. The map and the species directory hold everything it records.
      </EmptySheet>
    </div>
  );
}
