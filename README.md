# DatePlanner

A futuristic, mobile-first date planning web app inspired by the supplied visual references.

## Included
- Dark black UI with soft pink/blue neon accents
- Responsive desktop + touch-first mobile layout
- Open-Meteo geocoding + forecast
- OpenStreetMap Overpass nearby-POI discovery
- Weather-aware place scoring
- OSRM route calculation
- OpenFreeMap + MapLibre map
- Interest tags, date/time, budget, radius, group size, travel mode
- 2–4 stop itinerary generation
- Drag/reorder stops
- Swap individual stops
- Save to local storage
- Share via URL hash
- Graceful fallback UI when a public service fails

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

The app uses public endpoints and needs no API key for the services used in the MVP. Public third-party infrastructure is rate-limited and should be proxied/cached or self-hosted before production scale.
