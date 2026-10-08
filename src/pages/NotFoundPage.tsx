import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-serif text-6xl font-light tracking-tight text-forest-400">404</p>
      <h1 className="mt-3 font-serif text-3xl font-light tracking-tight text-canvas">Page not found</h1>
      <p className="mt-2 text-sm text-canvas/65">
        That page isn&rsquo;t part of the atlas. Try the interactive map or the species directory.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="rounded-xs border border-forest-600 px-4 py-2 text-sm font-medium text-canvas hover:bg-forest-900">
          Home
        </Link>
        <Link to="/atlas" className="rounded-xs bg-canvas px-4 py-2 text-sm font-medium text-ink hover:bg-parchment">
          Explore the map
        </Link>
      </div>
    </div>
  );
}
