# Offline Map Kit | public demo

An independent civilian navigation prototype, not an official ATAK/iTAK product. It includes a U.S. overview, a Beavercreek-area public map, selected trail and terrain layers, public hospital and shelter planning directories, and locally stored waypoints. It needs no account, analytics, or backend. The device location is requested only when the user presses the GPS control; it is not sent to the site. No saved waypoints from the private copy are published.

Open the site online once before using it offline. On iPhone open it in Safari, choose Share > Add to Home Screen, then open the home-screen app online before testing in airplane mode. Street-detail PMTiles are separate downloads from the linked publisher; import only desired states. GitHub Pages cannot run the private copy's shelter relay, so live shelter checks can fail; use the official shelter links if they do. Directory data is not live availability, verified navigation, or emergency advice.

## Data and software
- Overview: [Natural Earth public domain](https://www.naturalearthdata.com/about/terms-of-use/) and [U.S. Census TIGERweb](https://tigerweb.geo.census.gov/tigerweb/).
- Beavercreek map: Census TIGERweb, City of Beavercreek public park listings.
- Trails and parks: [USGS National Map](https://www.usgs.gov/programs/national-geospatial-program/national-map), [MVRPC](https://www.mvrpc.org/mobility/active-transportation/bikeways-map) and Greene County GIS.
- Terrain: [Mapzen/Terrarium terrain sources and attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
- Hospital directory: [HIFLD public data catalog](https://catalog.data.gov/dataset/hospitals-f56c2). Shelter planning: [FEMA ESF#6](https://gis.fema.gov/arcgis/rest/services/NSS/FEMA_NSS/FeatureServer).
- Optional detail pack downloads: [Action Stations](https://github.com/actionstations-ai/maps/releases), [Protomaps](https://protomaps.com/) and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL).
- Included third-party libraries use their respective MapLibre and PMTiles licenses. Noto font glyphs use the SIL Open Font License; see bundled notice.

## Deploy on GitHub Pages
Use the contents of this folder at the root of a new public repository; do not include the private project's other files, test exports or personal data. In Settings > Pages choose Deploy from a branch, main, /(root), and Save.
## Detailed map packs
In the atlas, choose Ohio, West Virginia, Virginia, Pennsylvania, or North Carolina. Download that state's PMTiles to Files, then choose Import PMTiles in the app you plan to use offline. The five files total 2.17 GB and are not stored in this repository. Keep your original download and test in airplane mode before relying on it.

To download all five archives on a computer, clone this repository and run 'node download-state-packs.cjs' with Node.js 22 or later. It checks file sizes and SHA-256 against pack-catalog.json. Use '--verify-only' to check installed copies without downloading. Browser imports do not perform those checks.
