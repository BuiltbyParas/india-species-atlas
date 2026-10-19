#!/usr/bin/env python3
"""
Builds public/india-states.geojson, the one India boundary the whole site draws.

Sources (all fetched here, nothing hand-drawn):
  * India State and UT boundary, updated January 2020 (AnujTiwari/India-State-
    and-Country-Shapefile-Updated-Jan-2020, EPSG:3857). A copy of the Survey of
    India state layer brought up to date for the 2019-20 reorganisations:
    Jammu and Kashmir and Ladakh are separate Union Territories, and Dadra and
    Nagar Haveli and Daman and Diu is one. Ladakh is the territory India claims
    there (Gilgit-Baltistan, Aksai Chin); Jammu and Kashmir includes
    Pakistan-administered Kashmir. Together they are India's political-map
    outline of the north. The repository states no licence.
  * Shaksgam Valley, Natural Earth "Admin-0 breakaway, disputed areas" (public
    domain), via DataMeet Country/disputed/shaksgam-ne.geojson. The layer above
    already holds most of the valley; the remaining slivers are merged into the
    northern territory, as Indian official maps place the valley in Leh district.

The atlas draws India as a political map, not a UT-by-UT administrative one: the
north is ONE feature, "Jammu and Kashmir" (Jammu and Kashmir + Ladakh, as on every
pre-2019 political map of India), so Ladakh is never a detached outline. Species
records that name Ladakh are matched to it through GEOJSON_STATE_ALIASES.

Steps: reproject to WGS84, repair invalid rings, join parts by state name, give
each state the name the atlas already uses, merge Shaksgam into Ladakh, then
simplify with mapshaper (topology-preserving: shared borders stay shared, every
island kept).

Needs: pip install pyshp shapely pyproj ; npx mapshaper (fetched on demand).
Usage: python3 scripts/geo/build-india-states.py [workdir]
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import shapefile
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform, unary_union
from shapely.validation import make_valid

RAW = 'https://raw.githubusercontent.com/datameet/maps/master'
STATES = ('https://raw.githubusercontent.com/AnujTiwari/'
          'India-State-and-Country-Shapefile-Updated-Jan-2020/master/India_State_Boundary')
SHAKSGAM = f'{RAW}/Country/disputed/shaksgam-ne.geojson'
OUT = Path(__file__).resolve().parents[2] / 'public' / 'india-states.geojson'

# Source spelling -> the names src/data and the map components already use.
NAMES = {
    'Andaman & Nicobar': 'Andaman & Nicobar Islands',
    'Daman and Diu and Dadra and Nagar Haveli': 'Dadra and Nagar Haveli and Daman and Diu',
    'Tamilnadu': 'Tamil Nadu',
    'Chhattishgarh': 'Chhattisgarh',
    'Telengana': 'Telangana',
}


def fetch(url: str, dest: Path) -> Path:
    if not dest.exists():
        urllib.request.urlretrieve(url, dest)
    return dest


def main() -> None:
    work = Path(sys.argv[1] if len(sys.argv) > 1 else 'build-geo')
    work.mkdir(parents=True, exist_ok=True)
    for ext in ('shp', 'shx', 'dbf'):
        fetch(f'{STATES}.{ext}', work / f'StateBoundary.{ext}')
    shaksgam = fetch(SHAKSGAM, work / 'shaksgam-ne.geojson')

    to_wgs84 = Transformer.from_crs(3857, 4326, always_xy=True).transform
    parts: dict[str, list] = {}
    for rec in shapefile.Reader(str(work / 'StateBoundary')).shapeRecords():
        raw = rec.record[0].strip()
        name = NAMES.get(raw, raw)
        geom = make_valid(transform(to_wgs84, shape(rec.shape.__geo_interface__)))
        parts.setdefault(name, []).append(geom)

    states = {name: unary_union(geoms) for name, geoms in parts.items()}

    valley = unary_union([shape(f['geometry']) for f in json.load(open(shaksgam))['features']])
    # One continuous northern territory. Close the hairlines between the
    # layers (and between J&K and Ladakh), then give the width back.
    north = unary_union([states.pop('Ladakh'), states['Jammu and Kashmir'], valley])
    states['Jammu and Kashmir'] = north.buffer(0.003).buffer(-0.003)

    features = [
        {'type': 'Feature', 'properties': {'state': n}, 'geometry': mapping(g)}
        for n, g in sorted(states.items())
    ]
    full = work / 'india-states.full.geojson'
    full.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}))

    subprocess.run(
        ['npx', '--yes', 'mapshaper', str(full),
         # Split into single parts first: keep-shapes then protects every
         # island (Andaman, Nicobar, Lakshadweep) instead of only each state's
         # largest piece, and the parts are joined back by state afterwards.
         '-explode', '-simplify', 'visvalingam', 'interval=3500', 'keep-shapes',
         '-dissolve', 'state', '-o', str(OUT), 'precision=0.001', 'format=geojson', 'force'],
        check=True,
    )
    print(f'wrote {OUT} ({OUT.stat().st_size // 1024} KB, {len(features)} features)')


if __name__ == '__main__':
    main()
