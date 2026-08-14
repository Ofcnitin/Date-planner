DatePlanner

«Plan better dates, based on the weather, your interests, budget, and location.»

🌐 Live Web App: https://ofcnitin.github.io/Date-planner/

DatePlanner is a futuristic, mobile-first date planning web app that turns a simple location, date, and set of preferences into a weather-aware multi-stop date itinerary. It discovers nearby places, scores them based on the forecast and your interests, calculates routes, and builds a practical 2–4 stop plan.

Designed with a sleek, premium dark interface and optimized for both mobile and desktop.

✨ Features

- 🌦️ Weather-aware planning — Uses real-time forecasts to influence place selection
- 📍 Nearby place discovery — Finds restaurants, cafes, parks, attractions, and other POIs
- 🧠 Smart place scoring — Ranks locations based on weather, interests, distance, and preferences
- 🗺️ Interactive maps — View your itinerary and stops on a MapLibre-powered map
- 🛣️ Route calculation — Calculates routes and travel distances between stops
- 🗓️ Custom date planning — Choose date, time, group size, budget, radius, and travel mode
- ❤️ Interest-based recommendations — Personalize plans using interest tags
- 🔄 2–4 stop itineraries — Automatically builds a complete date route
- ↕️ Drag & reorder — Easily change the order of your stops
- 🔁 Swap individual stops — Replace a single recommendation without rebuilding everything
- 💾 Local saving — Save your plans directly in the browser
- 🔗 Shareable plans — Share itineraries through URL hashes
- 🛡️ Graceful fallbacks — Continues working when a public service temporarily fails
- 📱 Mobile-first UI — Designed primarily for touch screens while remaining responsive on desktop

🧩 Technology

- Open-Meteo — Geocoding & weather forecasts
- OpenStreetMap Overpass API — Nearby place discovery
- OSRM — Route calculation
- OpenFreeMap — Map tiles
- MapLibre GL — Interactive maps
- LocalStorage — Client-side plan persistence

🚀 Run Locally

npm install
npm run dev

📦 Build

npm run build

🔑 API Requirements

The MVP uses public endpoints and does not require API keys for its current services.

Public third-party infrastructure is subject to rate limits and availability. For production-scale usage, the services should be proxied, cached, or self-hosted where appropriate.

🌐 Try It

Live: https://ofcnitin.github.io/Date-planner/

---

Made for turning “What should we do?” into an actual date plan.