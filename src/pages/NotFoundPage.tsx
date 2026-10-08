import { Link } from 'react-router-dom';
import { LineTitle } from '../components/cinema/LineTitle';
import { buttonClasses } from '../components/ui/buttonClasses';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center" data-trail>
      <p className="font-serif text-6xl font-light tracking-tight text-forest-400">404</p>
      <h1 className="mt-3 font-serif text-3xl font-light tracking-tight text-canvas">
        <LineTitle text="Page not found" />
      </h1>
      <p className="mt-4 text-sm text-canvas/65">
        That page isn&rsquo;t part of the atlas. Try the interactive map or the species directory.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className={buttonClasses('secondary')} data-magnetic="0.25">
          Home
        </Link>
        <Link to="/atlas" className={buttonClasses('primary')} data-magnetic="0.25">
          Explore the map
        </Link>
      </div>
    </div>
  );
}
