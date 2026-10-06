// Module shapes the film's bundle (Remotion's webpack) resolves for the site's
// data files: species photographs are imported as URLs, and the canonical
// boundary file as JSON.
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.geojson' {
  const value: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: { state: string };
      geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
    }>;
  };
  export default value;
}

// src/geo/india.ts reads Vite's import.meta.env inside a loader the film never calls.
interface ImportMeta {
  readonly env: { readonly BASE_URL: string };
}
