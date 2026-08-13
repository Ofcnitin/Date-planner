import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as maplibregl from "maplibre-gl"; 
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CloudRain,
  Compass, Heart, LocateFixed, MapPin, Menu, Navigation, Plus, RefreshCw,
  Search, Share2, Sparkles, Star, Sun, Thermometer, Trash2, Umbrella,
  Users, WalletCards, X, Zap, Footprints, Coffee, Trees, Mountain, Landmark,
  Utensils, SlidersHorizontal, Clock3, Route, Bookmark, BookmarkCheck,
  GripVertical, Info, ExternalLink, Loader2
} from 'lucide-react';
import './styles.css';

const ACCENT_PINK = '#e99bff';
const ACCENT_BLUE = '#79cdf4';
const DEFAULT_CENTER = [77.5946, 12.9716];
const INTERESTS = [
  { id: 'romantic', label: 'Romantic Walks', icon: Heart },
  { id: 'scenery', label: 'Scenery', icon: Trees },
  { id: 'restaurants', label: 'Restaurants', icon: Utensils },
  { id: 'comfort', label: 'Comfort', icon: Coffee },
  { id: 'adventure', label: 'Adventure', icon: Zap },
  { id: 'trek', label: 'Trek', icon: Mountain },
];

const TAGS = {
  romantic: [
    ['leisure', 'park'], ['leisure', 'garden'], ['tourism', 'viewpoint'], ['amenity', 'cafe']
  ],
  scenery: [
    ['tourism', 'viewpoint'], ['leisure', 'park'], ['natural', 'beach'], ['leisure', 'garden']
  ],
  restaurants: [
    ['amenity', 'restaurant'], ['amenity', 'cafe'], ['amenity', 'bar'], ['amenity', 'fast_food']
  ],
  comfort: [
    ['amenity', 'cafe'], ['amenity', 'restaurant'], ['shop', 'mall'], ['leisure', 'cinema']
  ],
  adventure: [
    ['sport', 'climbing'], ['sport', 'cycling'], ['leisure', 'sports_centre'], ['leisure', 'park']
  ],
  trek: [
    ['highway', 'path'], ['route', 'hiking'], ['natural', 'wood'], ['tourism', 'viewpoint']
  ]
};

const FALLBACK_PLACES = [
  { id: 'f1', name: 'Skyline Botanical Park', category: 'Scenery', lat: 12.9834, lon: 77.5882, tags: { leisure: 'park' }, score: 95, indoor: false, reason: 'Open-air greenery with quiet paths and wide views.' },
  { id: 'f2', name: 'Moonlight Coffee Lab', category: 'Cafe', lat: 12.9718, lon: 77.6030, tags: { amenity: 'cafe' }, score: 91, indoor: true, reason: 'Cozy seating, coffee and an easy rain-safe stop.' },
  { id: 'f3', name: 'Indigo Table', category: 'Restaurant', lat: 12.9681, lon: 77.5944, tags: { amenity: 'restaurant' }, score: 89, indoor: true, reason: 'Low-key dinner spot that fits a relaxed finish.' },
  { id: 'f4', name: 'Lakeside Promenade', category: 'Romantic Walk', lat: 12.9561, lon: 77.6010, tags: { leisure: 'park' }, score: 87, indoor: false, reason: 'Golden-hour-friendly route with space to wander.' }
];

function formatDateTime(dateValue) {
  if (!dateValue) return 'Today';
  const d = new Date(dateValue);
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function weatherLabel(code) {
  if (code === 0) return 'Clear';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Storm';
  return 'Mixed';
}

function weatherIcon(code) {
  if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return CloudRain;
  if ([1,2,3,45,48].includes(code)) return Umbrella;
  return Sun;
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function geocode(query) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const data = await jsonFetch(url);
  return data.results || [];
}

async function getWeather(lat, lon, dateValue) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m');
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code');
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('timezone', 'auto');
  const data = await jsonFetch(url);
  const target = dateValue ? new Date(dateValue) : new Date();
  const times = data.hourly?.time || [];
  let best = 0;
  let bestDelta = Infinity;
  times.forEach((t, i) => {
    const delta = Math.abs(new Date(t).getTime() - target.getTime());
    if (delta < bestDelta) { bestDelta = delta; best = i; }
  });
  const hourlyRain = data.hourly?.precipitation_probability?.[best] ?? 0;
  const current = data.current || {};
  return {
    temperature: Math.round(current.temperature_2m ?? data.hourly?.temperature_2m?.[best] ?? 25),
    feels: Math.round(current.apparent_temperature ?? data.hourly?.temperature_2m?.[best] ?? 25),
    rainChance: Math.round(hourlyRain),
    code: data.hourly?.weather_code?.[best] ?? current.weather_code ?? 0,
    wind: Math.round(current.wind_speed_10m ?? 0),
    time: times[best] || new Date().toISOString(),
    timezone: data.timezone,
  };
}

function buildOverpassQuery(lat, lon, radius, interests) {
  const clauses = [];
  interests.forEach((interest) => {
    (TAGS[interest] || []).forEach(([key, value]) => {
      clauses.push(`nwr[${key}=${value}](around:${radius},${lat},${lon});`);
    });
  });
  const unique = [...new Set(clauses)];
  if (!unique.length) unique.push(`nwr[amenity=cafe](around:${radius},${lat},${lon});`);
  return `[out:json][timeout:18];(${unique.slice(0, 26).join('')});out center tags;`;
}

async function searchPlaces(lat, lon, radius, interests) {
  const query = buildOverpassQuery(lat, lon, radius, interests);
  const endpoint = 'https://overpass-api.de/api/interpreter';
  const body = new URLSearchParams({ data: query });
  const response = await fetch(endpoint, { method: 'POST', body });
  if (!response.ok) throw new Error(`Overpass failed: ${response.status}`);
  const data = await response.json();
  const results = (data.elements || []).map((element) => {
    const tags = element.tags || {};
    const lat2 = element.lat ?? element.center?.lat;
    const lon2 = element.lon ?? element.center?.lon;
    const name = tags.name || tags['name:en'];
    if (!name || lat2 == null || lon2 == null) return null;
    const category = tags.amenity || tags.leisure || tags.tourism || tags.shop || tags.sport || tags.natural || 'Place';
    const indoor = ['cafe','restaurant','bar','fast_food','cinema','mall','sports_centre'].includes(tags.amenity || tags.leisure);
    const interestsHit = interests.filter(i => {
      const mapping = TAGS[i] || [];
      return mapping.some(([k,v]) => tags[k] === v);
    });
    return {
      id: `${element.type}-${element.id}`,
      name,
      category: category.replace(/_/g, ' '),
      lat: Number(lat2),
      lon: Number(lon2),
      tags,
      indoor,
      interestsHit,
      opening: tags.opening_hours || null,
      wheelchair: tags.wheelchair || null,
      website: tags.website || tags.contact?.website || null,
      phone: tags.phone || tags['contact:phone'] || null,
      address: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    };
  }).filter(Boolean);
  return dedupePlaces(results);
}

function dedupePlaces(places) {
  const seen = new Set();
  return places.filter(p => {
    const key = `${p.name.toLowerCase()}|${p.lat.toFixed(4)}|${p.lon.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI/180;
  const dLon = (b.lon - a.lon) * Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function scorePlaces(places, origin, weather, interests, budget) {
  const rainy = weather?.rainChance > 50;
  return places.map((p) => {
    const d = distanceKm(origin, p);
    const interestScore = Math.min(40, (p.interestsHit?.length || 0) * 14 + (p.category.toLowerCase().includes('restaurant') && interests.includes('restaurants') ? 15 : 0));
    const weatherScore = rainy ? (p.indoor ? 30 : -10) : (p.indoor ? 12 : 24);
    const proximityScore = Math.max(0, 24 - d * 5);
    const qualityScore = p.tags?.website ? 4 : 0;
    const wheelchair = p.tags?.wheelchair === 'yes' ? 4 : 0;
    const budgetScore = budget === 'low' && ['cafe','fast food'].some(v => p.category.includes(v)) ? 5 : 0;
    return {
      ...p,
      score: Math.round(interestScore + weatherScore + proximityScore + qualityScore + wheelchair + budgetScore),
      distance: d,
      reason: rainy && !p.indoor ? 'Outdoor option; weather may be less comfortable.' : rainy && p.indoor ? 'Weather-safe indoor match.' : 'Strong match for your selected vibe and route.',
    };
  }).sort((a,b) => b.score - a.score);
}

function choosePlan(places, origin, interests, weather, mode = 'foot') {
  const wantRestaurant = interests.includes('restaurants');
  const wantScenery = interests.some(i => ['scenery','romantic','trek'].includes(i));
  const wantComfort = interests.includes('comfort') || (weather?.rainChance > 50);
  const selected = [];
  const used = new Set();
  const addBest = (predicate) => {
    const item = places.find(p => !used.has(p.id) && predicate(p));
    if (item) { used.add(item.id); selected.push(item); }
  };
  addBest(p => wantScenery && !p.indoor);
  addBest(p => wantComfort && p.indoor);
  addBest(p => wantRestaurant && /restaurant|cafe|bar/.test(p.category));
  places.forEach(p => { if (selected.length < 4 && !used.has(p.id)) { used.add(p.id); selected.push(p); }});
  return selected.slice(0,4).map((p,i) => ({ ...p, stop: i+1, dwell: i===0 ? 55 : /restaurant/.test(p.category) ? 70 : 45 }));
}

async function routePlan(stops, mode = 'walking') {
  if (stops.length < 2) return null;
  const profile = mode === 'cycling' ? 'bike' : mode === 'driving' ? 'driving' : 'foot';
  const coords = stops.map(p => `${p.lon},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const data = await jsonFetch(url);
    if (data.code !== 'Ok') throw new Error('No route');
    return data.routes?.[0] || null;
  } catch {
    return null;
  }
}

function App() {
  const [locationQuery, setLocationQuery] = useState('Bengaluru, India');
  const [location, setLocation] = useState({ name: 'Bengaluru', lat: DEFAULT_CENTER[1], lon: DEFAULT_CENTER[0] });
  const [suggestions, setSuggestions] = useState([]);
  const [interests, setInterests] = useState(['romantic','scenery','restaurants']);
  const [dateValue, setDateValue] = useState(() => {
    const d = new Date(); d.setHours(17,30,0,0); return d.toISOString().slice(0,16);
  });
  const [budget, setBudget] = useState('medium');
  const [radius, setRadius] = useState(5);
  const [mode, setMode] = useState('walking');
  const [groupSize, setGroupSize] = useState(2);
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [plan, setPlan] = useState([]);
  const [route, setRoute] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(() => Boolean(localStorage.getItem('dateplanner-saved')));
  const [mobilePanel, setMobilePanel] = useState('planner');
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const selectedWeatherIcon = weatherIcon(weather?.code ?? 0);
  const WeatherIcon = selectedWeatherIcon;

  const totalDistance = route ? (route.distance / 1000).toFixed(1) : plan.reduce((sum,p,i) => sum + (i===0 ? distanceKm(location,p) : distanceKm(plan[i-1],p)), 0).toFixed(1);
  const totalDuration = route ? Math.round(route.duration / 60) : Math.round(plan.reduce((sum,p) => sum + p.dwell, 0) + Number(totalDistance) * (mode === 'driving' ? 2 : mode === 'cycling' ? 7 : 12));

  useEffect(() => {
    const style = 'https://tiles.openfreemap.org/styles/dark';
    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
      center: [location.lon, location.lat],
      zoom: 12.2,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    map.flyTo({ center: [location.lon, location.lat], zoom: 12.4, duration: 900 });
    if (plan.length) {
      const points = plan.map(p => [p.lon,p.lat]);
      const all = [[location.lon,location.lat], ...points];
      const lons = all.map(p=>p[0]), lats=all.map(p=>p[1]);
      map.fitBounds([[Math.min(...lons)-0.01, Math.min(...lats)-0.01],[Math.max(...lons)+0.01, Math.max(...lats)+0.01]], { padding: 70, duration: 900 });
    }
    if (map.getSource('plan-route')) map.removeLayer('plan-route');
    if (map.getSource('plan-route')) map.removeSource('plan-route');
    if (route?.geometry) {
      map.addSource('plan-route',{type:'geojson',data:{type:'Feature',geometry:route.geometry}});
      map.addLayer({id:'plan-route',type:'line',source:'plan-route',paint:{'line-color':'#9edfff','line-width':5,'line-opacity':0.9}});
    }
    map.markers?.forEach(m => m.remove());
    map.markers = [];
    plan.forEach((p, idx) => {
      const el = document.createElement('button');
      el.className = 'map-marker';
      el.textContent = idx + 1;
      el.addEventListener('click', () => setSelectedPlace(p));
      const marker = new maplibregl.Marker({element:el}).setLngLat([p.lon,p.lat]).addTo(map);
      map.markers.push(marker);
    });
  }, [location, plan, route]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (locationQuery.trim().length < 3 || locationQuery === location.name) { setSuggestions([]); return; }
      try { setSuggestions(await geocode(locationQuery)); } catch { setSuggestions([]); }
    }, 320);
    return () => clearTimeout(t);
  }, [locationQuery, location.name]);

  useEffect(() => {
    const hash = location.hash;
    if (!hash.startsWith('#plan=')) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(hash.slice(6)));
      if (decoded.location) setLocation(decoded.location);
      if (decoded.interests) setInterests(decoded.interests);
      if (decoded.plan) setPlan(decoded.plan);
    } catch {}
  }, []);

  const toggleInterest = (id) => setInterests(v => v.includes(id) ? v.filter(x=>x!==id) : [...v,id]);

  async function generatePlan() {
    setLoading(true); setMessage('');
    try {
      const w = await getWeather(location.lat, location.lon, dateValue);
      setWeather(w);
      let discovered = [];
      try { discovered = await searchPlaces(location.lat, location.lon, radius * 1000, interests.length ? interests : ['comfort']); }
      catch { discovered = []; }
      let scored = scorePlaces(discovered.length ? discovered : FALLBACK_PLACES, location, w, interests, budget);
      if (!scored.length) scored = FALLBACK_PLACES;
      setPlaces(scored);
      const nextPlan = choosePlan(scored, location, interests, w, mode);
      setPlan(nextPlan);
      const rt = await routePlan(nextPlan, mode);
      setRoute(rt);
      setMobilePanel('plan');
    } catch (error) {
      setMessage('Some live services are unavailable right now. Showing a resilient local plan shell so you can still explore the UI.');
      const w = { temperature: 24, feels: 25, rainChance: 18, code: 1, wind: 8 };
      setWeather(w);
      const scored = scorePlaces(FALLBACK_PLACES, location, w, interests, budget);
      setPlaces(scored);
      const nextPlan = choosePlan(scored, location, interests, w, mode);
      setPlan(nextPlan); setRoute(null); setMobilePanel('plan');
    } finally { setLoading(false); }
  }

  async function regenerate() {
    if (!places.length) return generatePlan();
    setLoading(true);
    const shuffled = [...places].sort(() => Math.random()-0.5);
    const next = choosePlan(shuffled, location, interests, weather, mode);
    setPlan(next); setRoute(await routePlan(next, mode)); setLoading(false);
  }

  async function swapStop(index) {
    const existing = new Set(plan.map(p => p.id));
    const candidate = places.find(p => !existing.has(p.id) && (weather?.rainChance > 50 ? p.indoor : true)) || places.find(p=>!existing.has(p.id));
    if (!candidate) return;
    const next = [...plan]; next[index] = { ...candidate, stop: index+1, dwell: candidate.dwell || 45 };
    setPlan(next); setRoute(await routePlan(next, mode));
    setSelectedPlace(null);
  }

  async function onDrop(from, to) {
    const next = [...plan]; const [item] = next.splice(from,1); next.splice(to,0,item);
    setPlan(next.map((p,i)=>({...p,stop:i+1}))); setRoute(await routePlan(next,mode));
  }

  function savePlan() {
    localStorage.setItem('dateplanner-saved', JSON.stringify({location,interests,weather,plan,dateValue,budget,radius,mode,groupSize}));
    setSaved(true); setMessage('Plan saved on this device.');
  }

  async function sharePlan() {
    const payload = encodeURIComponent(JSON.stringify({location,interests,plan}));
    const url = `${window.location.origin}${window.location.pathname}#plan=${payload}`;
    try { await navigator.clipboard.writeText(url); setMessage('Share link copied.'); }
    catch { window.prompt('Copy this plan link', url); }
  }

  function selectSuggestion(item) {
    setLocation({ name: item.name, lat: item.latitude, lon: item.longitude });
    setLocationQuery(`${item.name}${item.country ? ', '+item.country : ''}`);
    setSuggestions([]);
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setMessage('Geolocation is not available in this browser.'); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      const {latitude,longitude} = pos.coords;
      setLocation({ name: 'Your location', lat: latitude, lon: longitude });
      setLocationQuery('Your location');
      try { const found = await geocode(`${latitude},${longitude}`); if (found?.[0]) setLocation({name:found[0].name,lat:latitude,lon:longitude}); } catch {}
    }, () => setMessage('Location permission was denied.'));
  }

  const headline = weather?.rainChance > 50 ? 'A rain-ready date' : 'Your date, optimized';

  return (
    <div className="app-shell">
      <div className="ambient ambient-pink" />
      <div className="ambient ambient-blue" />

      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Sparkles size={16}/></span><span>DatePlanner</span></div>
        <nav className="desktop-nav"><a href="#planner">Planner</a><a href="#discover">Discover</a><a href="#saved">Saved</a></nav>
        <div className="top-actions"><button className="icon-btn desktop-only" title="Saved"><BookmarkCheck size={18}/></button><button className="icon-btn mobile-only" onClick={()=>setMobilePanel('planner')}><Menu size={20}/></button></div>
      </header>

      <main className="page" id="planner">
        <section className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse-dot"></span> WEATHER-AWARE DATE INTELLIGENCE</div>
            <h1>Make the moment<br/><span>worth remembering.</span></h1>
            <p>Tell us the vibe, where you are and when you鈥檙e going. DatePlanner composes a live route around places, weather and travel time.</p>
            <div className="hero-stats"><div><b>4</b><span>stops, max</span></div><div><b>&lt;5s</b><span>target generation</span></div><div><b>24/7</b><span>live signals</span></div></div>
          </div>
          <div className="signal-card">
            <div className="signal-top"><span>LIVE CONTEXT</span><span className="live-badge"><i></i> Online</span></div>
            <div className="weather-hero"><div><div className="weather-kicker">{location.name}</div><div className="weather-temp">{weather ? `${weather.temperature}掳` : '鈥�'}</div><div className="weather-state">{weather ? weatherLabel(weather.code) : 'Set a place to begin'}</div></div><WeatherIcon size={58} strokeWidth={1.4}/></div>
            <div className="signal-row"><span><Umbrella size={15}/> Rain {weather ? `${weather.rainChance}%` : '鈥�'}</span><span><Thermometer size={15}/> Feels {weather ? `${weather.feels}掳` : '鈥�'}</span><span><Navigation size={15}/> {weather ? `${weather.wind} km/h` : '鈥�'}</span></div>
          </div>
        </section>

        <section className="planner-card" id="discover">
          <div className="planner-head"><div><p className="section-kicker">BUILD YOUR VIBE</p><h2>Design a date in seconds.</h2></div><div className="mode-switch"><button className={mode==='walking'?'active':''} onClick={()=>setMode('walking')}><Footprints size={15}/> Walk</button><button className={mode==='cycling'?'active':''} onClick={()=>setMode('cycling')}><Navigation size={15}/> Bike</button><button className={mode==='driving'?'active':''} onClick={()=>setMode('driving')}><Route size={15}/> Drive</button></div></div>
          <div className="interest-scroller">{INTERESTS.map(({id,label,icon:Icon})=><button key={id} className={`interest-chip ${interests.includes(id)?'selected':''}`} onClick={()=>toggleInterest(id)}><Icon size={16}/>{label}</button>)}</div>
          <div className="control-grid">
            <div className="control location-control"><div className="control-label"><MapPin size={15}/> Where</div><div className="search-line"><Search size={18}/><input value={locationQuery} onChange={e=>setLocationQuery(e.target.value)} placeholder="City or area" /><button className="locate-btn" onClick={useMyLocation}><LocateFixed size={17}/></button></div>{suggestions.length>0&&<div className="suggestions">{suggestions.map(s=><button key={`${s.id}-${s.latitude}`} onClick={()=>selectSuggestion(s)}><MapPin size={15}/><span><b>{s.name}</b><small>{[s.admin1,s.country].filter(Boolean).join(', ')}</small></span></button>)}</div>}</div>
            <div className="control"><div className="control-label"><CalendarDays size={15}/> Date & time</div><input type="datetime-local" value={dateValue} onChange={e=>setDateValue(e.target.value)} /></div>
            <div className="control"><div className="control-label"><WalletCards size={15}/> Budget</div><div className="segmented">{['low','medium','high'].map(v=><button key={v} className={budget===v?'active':''} onClick={()=>setBudget(v)}>{v}</button>)}</div></div>
            <div className="control"><div className="control-label"><Users size={15}/> Group size</div><div className="number-stepper"><button onClick={()=>setGroupSize(Math.max(2,groupSize-1))}>鈭�</button><b>{groupSize}</b><button onClick={()=>setGroupSize(Math.min(12,groupSize+1))}>+</button></div></div>
          </div>
          <div className="advanced-row"><div className="radius"><span>Search radius</span><b>{radius} km</b><input type="range" min="1" max="20" step="1" value={radius} onChange={e=>setRadius(Number(e.target.value))}/></div><div className="advanced-meta"><span><Clock3 size={14}/> {formatDateTime(dateValue)}</span><span><SlidersHorizontal size={14}/> {interests.length || 0} vibes</span></div><button className="generate-btn" onClick={generatePlan} disabled={loading}>{loading?<Loader2 className="spin" size={18}/>:<Sparkles size={18}/>} {loading?'Composing鈥�':'Generate my date'}<ArrowRight size={17}/></button></div>
          {message && <div className="message"><Info size={15}/>{message}<button onClick={()=>setMessage('')}><X size={14}/></button></div>}
        </section>

        <section className="results-grid" id="saved">
          <div className="results-side">
            <div className="results-head"><div><p className="section-kicker">YOUR ITINERARY</p><h2>{plan.length ? headline : 'Ready when you are.'}</h2></div><div className="result-actions"><button onClick={savePlan} title="Save plan">{saved?<BookmarkCheck size={17}/>:<Bookmark size={17}/>}</button><button onClick={sharePlan} title="Share"><Share2 size={17}/></button><button onClick={regenerate} title="Regenerate"><RefreshCw size={17}/></button></div></div>
            {plan.length ? <>
              <div className="route-summary"><div><Route size={17}/><span><b>{totalDistance} km</b><small>route</small></span></div><div><Clock3 size={17}/><span><b>{totalDuration} min</b><small>estimated</small></span></div><div className={weather?.rainChance>50?'warning':''}><WeatherIcon size={17}/><span><b>{weather?.rainChance ?? 0}%</b><small>rain chance</small></span></div></div>
              <div className="timeline">{plan.map((stop,idx)=><div key={stop.id} className="timeline-item" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',String(idx))} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(Number(e.dataTransfer.getData('text/plain')),idx)}><div className="drag"><GripVertical size={16}/></div><div className="stop-index">{idx+1}</div><button className="stop-card" onClick={()=>setSelectedPlace(stop)}><div className="stop-visual"><div className={`visual-orb orb-${idx}`}></div><div className="stop-tag">{stop.category}</div></div><div className="stop-content"><div className="stop-top"><h3>{stop.name}</h3><span className="score"><Star size={13} fill="currentColor"/>{Math.min(99, Math.max(75, stop.score || 88))}</span></div><p>{stop.reason}</p><div className="stop-meta"><span><MapPin size={13}/>{stop.distance ? `${stop.distance.toFixed(1)} km away` : 'Nearby'}</span><span><Clock3 size={13}/>{stop.dwell || 45} min</span></div></div></button><button className="swap-btn" onClick={(e)=>{e.stopPropagation();swapStop(idx)}}><RefreshCw size={14}/> Swap</button></div>)}</div>
            </> : <div className="empty-state"><div className="empty-ring"><Sparkles size={26}/></div><h3>One tap to build the route</h3><p>Pick a few vibes, choose a time and let DatePlanner balance scenery, food, comfort and weather.</p><button className="outline-btn" onClick={generatePlan}><Sparkles size={16}/> Try a plan</button></div>}
          </div>
          <div className="map-panel"><div ref={mapRef} className="map"></div><div className="map-overlay"><div><span className="map-pill"><MapPin size={14}/>{location.name}</span><span className="map-pill ghost">{interests.length} vibes</span></div><button className="recenter-btn" onClick={()=>mapInstance.current?.flyTo({center:[location.lon,location.lat],zoom:13,duration:800})}><Compass size={16}/></button></div>{plan.length>0&&<div className="map-legend"><span><i className="legend-dot pink"></i>Plan stops</span><span><i className="legend-dot blue"></i>Route</span></div>}</div>
        </section>
      </main>

      <footer><span>DATEPLANNER / v1.0</span><span>Open data 路 Session-first 路 No account required</span><span>Built for the moment.</span></footer>

      {selectedPlace && <div className="modal-backdrop" onClick={()=>setSelectedPlace(null)}><div className="place-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelectedPlace(null)}><X size={18}/></button><div className="modal-visual"><div className="modal-orb"></div><span>{selectedPlace.category}</span></div><div className="modal-body"><div className="modal-title"><div><p className="section-kicker">STOP {selectedPlace.stop || ''}</p><h2>{selectedPlace.name}</h2></div><div className="score big"><Star size={14} fill="currentColor"/>{Math.min(99, Math.max(75,selectedPlace.score||88))}</div></div><p>{selectedPlace.reason}</p><div className="detail-grid"><div><small>Distance</small><b>{selectedPlace.distance ? `${selectedPlace.distance.toFixed(1)} km` : 'Nearby'}</b></div><div><small>Suggested stay</small><b>{selectedPlace.dwell || 45} min</b></div><div><small>Weather fit</small><b>{weather?.rainChance>50 ? (selectedPlace.indoor?'Excellent':'Fair') : 'Good'}</b></div><div><small>Access</small><b>{selectedPlace.wheelchair==='yes'?'Wheelchair friendly':'Check OSM'}</b></div></div><div className="modal-actions"><button className="outline-btn" onClick={()=>setSelectedPlace(null)}>Close</button>{selectedPlace.website&&<a href={selectedPlace.website} target="_blank" rel="noreferrer" className="generate-btn small"><ExternalLink size={15}/> Website</a>}</div></div></div></div>}

      <div className="mobile-bar"><button className={mobilePanel==='planner'?'active':''} onClick={()=>setMobilePanel('planner')}><Sparkles size={18}/><span>Plan</span></button><button className={mobilePanel==='plan'?'active':''} onClick={()=>setMobilePanel('plan')}><Route size={18}/><span>Route</span></button><button onClick={sharePlan}><Share2 size={18}/><span>Share</span></button></div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
