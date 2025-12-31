import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Briefcase, Building, ExternalLink, MapPin, Navigation as NavIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

// --- VISUAL CONSTANTS ---
const FRANCE_CENTER = [46.603354, 1.888334];
const ZOOM_LEVEL = 6;
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes

// --- UTILS: GEOCODING ---
// Load cache from LocalStorage if available, otherwise default to static
const getInitialCache = () => {
    try {
        const stored = localStorage.getItem('SASRE_CITY_CACHE');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.warn('Failed to load city cache', e);
    }

    return {
        'remote': null,
        'télétravail': null,
        'france': FRANCE_CENTER,
        'paris': [48.8566, 2.3522],
        'lyon': [45.7640, 4.8357],
        'marseille': [43.2965, 5.3698],
        'bordeaux': [44.8378, -0.5792],
        'toulouse': [43.6047, 1.4442],
        'nantes': [47.2184, -1.5536],
        'lille': [50.6292, 3.0573],
        'strasbourg': [48.5734, 7.7521],
        'montpellier': [43.6108, 3.8767],
        'rennes': [48.1173, -1.6778],
        'nice': [43.7102, 7.2620],
        'saint-chinian': [43.4218, 2.9463],
    };
};

const CITY_CACHE = getInitialCache();

const saveCache = () => {
    try {
        localStorage.setItem('SASRE_CITY_CACHE', JSON.stringify(CITY_CACHE));
        localStorage.setItem('SASRE_LAST_GEOCODE_RUN', Date.now().toString());
    } catch (e) {
        console.warn('Cache save failed', e);
    }
};

// IMPROVED NORMALIZATION
const normalizeCity = (city) => {
    if (!city) return '';
    let clean = city.toLowerCase();
    if (clean.includes('télétravail') || clean.includes('remote') || clean.includes('full home office')) return 'remote';
    clean = clean.replace(/\bfrance\b/g, '');
    clean = clean.replace(/[0-9]/g, '');
    clean = clean.replace(/[-.,;()|]/g, ' ');
    return clean.replace(/\s+/g, ' ').trim();
};

const geocodeCity = async (city) => {
    const cleanName = normalizeCity(city);
    if (!cleanName || cleanName.length < 2) return null;
    if (cleanName === 'remote') return null;

    if (CITY_CACHE[cleanName] !== undefined) return CITY_CACHE[cleanName];

    try {
        // Fetch API
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cleanName)}&limit=1`);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const coords = data.features[0].geometry.coordinates;
            const latLon = [coords[1], coords[0]];
            CITY_CACHE[cleanName] = latLon;
            saveCache();
            return latLon;
        } else {
            CITY_CACHE[cleanName] = null;
            saveCache();
        }
    } catch (error) {
        // Warning suppressed
    }
    return null;
};

// --- COMPONENT: MapView ---
const MapView = ({ jobs }) => {
    const [geocodedJobs, setGeocodedJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [lastRun, setLastRun] = useState(null);

    // Initial Load just to populate map with ALREADY cached data (Instant)
    useEffect(() => {
        const last = localStorage.getItem('SASRE_LAST_GEOCODE_RUN');
        if (last) setLastRun(new Date(parseInt(last)));

        const quickLoad = () => {
            const validJobs = jobs.filter(j => j.Lieu && j.Statut !== 'ARCHIVEE' && j.Statut !== 'SUPPRIMEE');
            const instantResults = validJobs.map(job => {
                const clean = normalizeCity(job.Lieu);
                const cached = CITY_CACHE[clean];
                return cached ? { ...job, coords: cached } : null;
            }).filter(j => j !== null);
            setGeocodedJobs(instantResults);
        };
        quickLoad();
    }, [jobs]);


    // Background Geocoder
    const runGeocoding = async (force = false) => {
        if (loading) return;

        const now = Date.now();
        const last = parseInt(localStorage.getItem('SASRE_LAST_GEOCODE_RUN') || '0');

        // Cooldown Check
        if (!force && (now - last < CACHE_DURATION)) {
            console.log("Skipping auto-geocode: Cooldown active");
            return;
        }

        setLoading(true);
        const validJobs = jobs.filter(j => j.Lieu && j.Statut !== 'ARCHIVEE' && j.Statut !== 'SUPPRIMEE');
        const total = validJobs.length;
        let completed = 0;
        const results = [];
        const BATCH_SIZE = 15;

        // Use a loop that allows updating the map PROGRESSIVELY
        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = validJobs.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (job) => {
                const coords = await geocodeCity(job.Lieu);
                return coords ? { ...job, coords } : null;
            });

            const batchResults = await Promise.all(batchPromises);
            // Push results as we go?? No, let's collect.
            results.push(...batchResults.filter(j => j !== null));

            completed += batch.length;
            setProgress(Math.round((completed / total) * 100));
            await new Promise(r => setTimeout(r, 20)); // Breathe
        }

        setGeocodedJobs(results);
        setLoading(false);
        setLastRun(new Date());
        localStorage.setItem('SASRE_LAST_GEOCODE_RUN', Date.now().toString());
    };

    // Auto-run on mount (respecting rules)
    useEffect(() => {
        runGeocoding(false);
    }, [jobs]); // Only re-try if jobs change significantly?

    return (
        <div className="h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative isolate bg-gray-100 dark:bg-gray-800">

            {/* --- CONTROLS OVERLAY (Non-blocking) --- */}
            <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-3 pointer-events-none">

                {/* Legend */}
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-w-xs pointer-events-auto">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2 text-sm flex items-center gap-2">
                        <MapPin size={16} className="text-pepite-gold" /> Bassins d'emploi
                    </h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p>Géolocalisées : <strong className="text-gray-800 dark:text-gray-200">{geocodedJobs.length}</strong> / {jobs.length}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Score +</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Neutre</span>
                        </div>
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 pointer-events-auto transition-all w-fit">
                    {loading ? (
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-pepite-gold border-r-transparent"></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-pepite-dark dark:text-gray-200">Enrichissement carte...</span>
                                <span className="text-[10px] text-gray-500">{progress}% terminé</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-gray-400">
                                    Dernière MAJ : {lastRun ? lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                                </span>
                            </div>
                            <button
                                onClick={() => runGeocoding(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-pepite-gold/10 hover:bg-pepite-gold/20 text-pepite-dark dark:text-pepite-gold rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                disabled={loading}
                            >
                                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                                Rafraîchir la carte
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <MapContainer center={FRANCE_CENTER} zoom={ZOOM_LEVEL} className="h-full w-full z-0">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    className="dark:filter dark:invert dark:grayscale dark:contrast-75"
                />

                {geocodedJobs.map(job => (
                    <React.Fragment key={job.ID_Annonce}>
                        <CircleMarker
                            center={job.coords}
                            radius={20 + (job.score_ATS || 0) / 5}
                            pathOptions={{
                                color: job.score_ATS > 0 ? '#10B981' : '#F5A623',
                                fillColor: job.score_ATS > 0 ? '#10B981' : '#F5A623',
                                fillOpacity: 0.1,
                                stroke: false
                            }}
                        />
                        <Marker
                            position={job.coords}
                            icon={divIcon({
                                className: 'bg-transparent',
                                html: `<div class="w-3 h-3 rounded-full border-2 border-white shadow-sm ${job.score_ATS > 0 ? 'bg-green-500' : 'bg-yellow-500'}"></div>`,
                                iconSize: [12, 12],
                                iconAnchor: [6, 6]
                            })}
                        >
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[200px]">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-sm text-gray-800 leading-tight">{job.Titre_poste}</h3>
                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${job.score_ATS > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {job.score_ATS} pts
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 mb-2">
                                        <Building size={12} className="mr-1" /> {job.Entreprise}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <a href={job.URL_offre} target="_blank" className="flex-1 bg-pepite-dark text-white text-xs py-1.5 rounded text-center hover:bg-black transition-colors">
                                            Voir l'offre
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    </React.Fragment>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
