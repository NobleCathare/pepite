import { pb } from './pb.js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const FT_API_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';
const FT_AUTH_TARGET = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';
const ALGOLIA_TARGET = 'https://CSEKHVMS53-dsn.algolia.net/1/indexes/wttj_jobs_production_fr/query';

// HELPER: Returns the correct URL depending on Environment (Dev/Prod)
// In Dev: Use Vite Proxy (defined in vite.config.js)
// In Prod: Use Public CORS Proxy (GitHub Pages cannot proxy itself)
const getProxyUrl = (endpointType, targetUrl = '') => {
    if (import.meta.env.DEV) {
        if (endpointType === 'auth') return '/auth-ft/connexion/oauth2/access_token?realm=/partenaire';
        if (endpointType === 'algolia') return '/api-algolia/1/indexes/wttj_jobs_production_fr/query';
        if (endpointType === 'ft_api') return `/api-ft${targetUrl.replace('https://api.francetravail.io', '')}`;
    } else {
        // PRODUCTION (GitHub Pages) -> Use CORS Proxy
        // Public Proxies are unstable.
        // Trying: cors.eu.org (Robust, standard CORS handling)
        // Note: URL encoding is NOT required for cors.eu.org in the path, but let's be safe for parameters.
        // Format: https://cors.eu.org/https://...
        const proxyBase = 'https://cors.eu.org/';

        // Remove the encoding for the base URL part as cors.eu.org simply appends it
        if (endpointType === 'auth') return `${proxyBase}${FT_AUTH_TARGET}`;
        if (endpointType === 'algolia') return `${proxyBase}${ALGOLIA_TARGET}`;
        if (endpointType === 'ft_api') return `${proxyBase}${targetUrl}`;
    }
    return targetUrl;
};

const ALGOLIA_WTTJ_URL = getProxyUrl('algolia'); // For consistency, though computed dynamically below

// WTTJ Public Keys (found in n8n workflow / public site)
const ALGOLIA_APP_ID = 'CSEKHVMS53';
const ALGOLIA_API_KEY = '4bd8f6215d0cc52b26430765769e65a0';

// Cache pour le token OAuth2 FT
let cachedToken = null;
let tokenExpiry = null;

// ═══════════════════════════════════════════════════════════════
// AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════

async function getFranceTravailToken() {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const FT_CLIENT_ID = import.meta.env.VITE_FT_CLIENT_ID || '';
    const FT_CLIENT_SECRET = import.meta.env.VITE_FT_CLIENT_SECRET || '';

    if (!FT_CLIENT_ID || !FT_CLIENT_SECRET) {
        console.error("[DEBUG] FT Credentials MISSING. ID:", FT_CLIENT_ID ? 'Present' : 'Missing', "Secret:", FT_CLIENT_SECRET ? 'Present' : 'Missing');
        throw new Error('France Travail credentials not configured (.env)');
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: FT_CLIENT_ID,
            client_secret: FT_CLIENT_SECRET,
            scope: 'api_offresdemploiv2 o2dsoffre'
        });

        const targetUrl = getProxyUrl('auth');
        console.log(`[Auth] Fetching Token from: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!response.ok) {
            throw new Error(`OAuth2 failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);

        return cachedToken;
    } catch (error) {
        console.error('Error getting France Travail token:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// APPELS API
// ═══════════════════════════════════════════════════════════════

async function searchFranceTravail(searchConfig, token) {
    const params = new URLSearchParams({
        motsCles: searchConfig.Mot_Cle || '',
        sort: '1',
        range: '0-149'
    });

    if (searchConfig.Codes_ROME) params.append('codeROME', searchConfig.Codes_ROME);
    if (searchConfig.Type_Lieu && searchConfig.Code_Lieu) params.append(searchConfig.Type_Lieu, searchConfig.Code_Lieu);
    if (searchConfig.Km) params.append('distance', searchConfig.Km);
    if (searchConfig.Contrat) params.append('typeContrat', searchConfig.Contrat);

    // Dynamic URL based on environment
    const fullUrl = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`;
    const proxyUrl = getProxyUrl('ft_api', fullUrl);

    // console.log(`[FT] Search URL: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 204) return []; // Pas de résultat

    if (!response.ok) {
        // Log detailed error from FT API
        const errorText = await response.text();
        console.error("FT API Error Body:", errorText);
        throw new Error(`FT API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.resultats || [];
}

async function searchWTTJ(searchConfig) {
    try {
        const query = searchConfig.Mot_Cle || '';

        // Construction de la requête Algolia
        const body = {
            params: `query=${encodeURIComponent(query)}&hitsPerPage=50`
        };

        const targetUrl = getProxyUrl('algolia');

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'X-Algolia-Application-Id': ALGOLIA_APP_ID,
                'X-Algolia-API-Key': ALGOLIA_API_KEY,
                'Referer': 'https://www.welcometothejungle.com/',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`WTTJ (Algolia) API error: ${response.status}`);

        const data = await response.json();
        return data.hits || [];

    } catch (error) {
        console.error('Error searching WTTJ:', error);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
// NORMALISATION
// ═══════════════════════════════════════════════════════════════

function normalizeFT(rawData, keyword, userId) {
    return {
        ID_Annonce: `FT_${rawData.id}`,
        Titre_poste: rawData.intitule || '',
        Entreprise: rawData.entreprise?.nom || '',
        Lieu: rawData.lieuTravail?.libelle || '',
        Description: rawData.description || '',
        URL_offre: rawData.origineOffre?.urlOrigine || '',
        URL_Entreprise: '',
        Source: 'FT',
        Type_contrat: rawData.typeContrat || '',
        Salaire: rawData.salaire?.libelle || 'Non communiqué',
        Date_Publication: rawData.dateCreation || new Date().toISOString(),
        Mot_cle_source: keyword,
        Email_Recruteur: rawData.contact?.courriel || '',
        Nom_Recruteur: rawData.contact?.nom || '',
        Prenom_Recruteur: rawData.contact?.prenom || '',
        Poste_Recruteur: '',
        Linkedin_Recruteur: '',
        tel_recruteur: rawData.contact?.telephone || '',
        Statut: 'Nouvelle',
        ownerId: userId,
        Date_Traitement: new Date().toISOString()
    };
}

function mapContractTypeWTTJ(type) {
    const map = {
        'full_time': 'CDI',
        'part_time': 'CDI (Temps partiel)',
        'temporary': 'CDD / Intérim',
        'freelance': 'Freelance',
        'internship': 'Stage',
        'apprenticeship': 'Alternance',
        'vie': 'VIE',
        'phd': 'Thèse'
    };
    return map[type] || type || 'Autre';
}

function normalizeWTTJ(rawData, keyword, userId) {
    const orgSlug = rawData.organization?.slug || rawData.company?.slug || 'unknown';
    const jobSlug = rawData.slug || 'unknown';
    const url = `https://www.welcometothejungle.com/fr/companies/${orgSlug}/jobs/${jobSlug}`;

    // Extraction Lieu (premier bureau disponible)
    const office = rawData.offices && rawData.offices.length > 0 ? rawData.offices[0] : null;
    const lieu = office ? `${office.city || ''}, ${office.country_code || 'FR'}` : (rawData.office?.city || 'France');

    // WTTJ Algolia hits often miss full description. Try multiple fields.
    const description = rawData.content ||
        rawData.description ||
        rawData.description_html || // Sometimes present
        rawData.meta_description ||
        `Voir l'offre sur WTTJ`;

    return {
        ID_Annonce: `WTTJ_${rawData.objectID}`,
        Titre_poste: rawData.name || '',
        Entreprise: rawData.organization?.name || rawData.company?.name || '',
        Lieu: lieu,
        Description: description,
        URL_offre: url,
        URL_Entreprise: rawData.organization?.website || '',
        Source: 'WTTJ',
        Type_contrat: mapContractTypeWTTJ(rawData.contract_type),
        Salaire: 'Non communiqué',
        Date_Publication: rawData.published_at || new Date().toISOString(),
        Mot_cle_source: keyword,
        Email_Recruteur: '',
        Nom_Recruteur: '',
        Prenom_Recruteur: '',
        Statut: 'Nouvelle',
        ownerId: userId,
        Date_Traitement: new Date().toISOString()
    };
}

// ═══════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════

function calculateScore(job, filters) {
    const normalize = (str) => {
        if (!str) return '';
        return str.toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    };

    const zones = {
        "Titre": normalize(job.Titre_poste || ""),
        "Description": normalize(job.Description || ""),
        "Entreprise": normalize(job.Entreprise || ""),
        "Global": normalize(`${job.Titre_poste} ${job.Description} ${job.Entreprise}`)
    };

    let score = 0;
    let matches = [];

    for (const filter of filters) {
        const isActive = filter.Actif === true || filter.Actif === 'true';
        if (!isActive || !filter.Valeur) continue;

        const keyword = normalize(filter.Valeur);
        const targetText = zones[filter.Categorie] || zones["Global"];
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matchCount = (targetText.match(regex) || []).length;

        if (matchCount > 0) {
            if (filter.Type === "BLACKLIST") return null;

            const weight = parseInt(filter.Poids) || 0;
            const points = (filter.Type === "BOOST") ? (weight * matchCount) : weight;

            if (points !== 0) {
                score += points;
                matches.push(`${filter.Valeur} (${points > 0 ? '+' : ''}${points})`);
            }
        }
    }

    return {
        score_interne: score,
        score_details: matches.length > 0 ? matches.join(' ; ') : 'Aucun bonus'
    };
}

// ═══════════════════════════════════════════════════════════════
// IMPORT URL (JINA AI)
// ═══════════════════════════════════════════════════════════════

export async function fetchJinaContent(targetUrl) {
    const JINA_API_KEY = import.meta.env.VITE_JINA_API_KEY || '';

    // Construct Jina URL
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const response = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${JINA_API_KEY}`,
            'X-Return-Format': 'markdown',
            'X-With-Generated-Alt': 'true'
        }
    });

    if (!response.ok) throw new Error(`Jina API error: ${response.status}`);
    const markdown = await response.text();

    // Basic parsing of the Jina Markdown response
    let title = "Offre Importée (Jina)";
    let company = "Inconnu";

    // ... (Parsing logic reused) ...
    let h1Match = markdown.match(/^#\s+(.+)$/m);
    if (!h1Match) h1Match = markdown.match(/^(.+)\n=+\s*$/m);
    if (h1Match) {
        title = h1Match[1].trim();
    } else {
        const lines = markdown.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 0) {
            const candidate = lines[0].replace(/^[#*>\s]+/, '').trim();
            if (candidate.length < 150) title = candidate;
        }
    }

    let cleanTitle = title;
    let cleanCompany = company; // Default "Inconnu"

    if (title.includes(' hiring ')) {
        const parts = title.split(' hiring ');
        cleanCompany = parts[0].trim();
        if (parts[1]) cleanTitle = parts[1].split(' in ')[0].trim();
    } else if (title.includes(' recrute ')) {
        const parts = title.split(' recrute ');
        cleanCompany = parts[0].trim();
        if (parts[1]) cleanTitle = parts[1].split(/ (?:à|in|pour) /)[0].trim();
    }

    // Location
    let location = 'Non spécifié';
    const lieuMatch = markdown.match(/### .*\n\n\[.*\]\(.*?\)\s*(.*)\n/);
    if (lieuMatch) {
        location = lieuMatch[1].replace(/\(.*?\)/g, '').replace(/[\[\]"]/g, '').trim();
    } else {
        const fallbackMatch = markdown.match(/([A-Z][a-zA-Z\s-]+,\s*[A-Z][a-zA-Z\s-]+,\s*(?:France|Suisse|Belgique))/m);
        if (fallbackMatch) location = fallbackMatch[0].trim();
    }

    // Description
    let description = "";
    const anchor = "Description du poste";
    const regexAnchor = new RegExp(anchor, 'i');
    if (regexAnchor.test(markdown)) {
        description = markdown.split(regexAnchor).pop();
    } else {
        const cookieSplit = markdown.split('Cookie Policy.');
        if (cookieSplit.length > 1) description = cookieSplit.pop();
        else description = markdown;
    }

    // Clean description
    description = description.split('Show more')[0].split('Show less')[0].split('### Seniority level')[0];
    description = description
        .replace(/\*\*/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Contract
    const contractMatch = markdown.match(/\* +### +Employment type\n\n +(.*)/i);
    const contract = contractMatch ? contractMatch[1].trim() : "Full-time";

    // Salary
    const salaryMatch = markdown.match(/(\d{2,3}\s?[kK]€|\d{2,5}\s?€)/);
    const salary = salaryMatch ? salaryMatch[0] : "Non communiqué";

    return {
        title: cleanTitle,
        company: cleanCompany !== "Inconnu" ? cleanCompany : (cleanTitle !== title ? cleanCompany : "Entreprise à préciser"),
        location,
        description,
        contract,
        salary,
        markdown // Return raw markdown too just in case
    };
}

async function importJobFromUrl(targetUrl, userId) {
    try {
        const content = await fetchJinaContent(targetUrl);

        // --- ATS ANALYSIS MOVED TO BACKGROUND WORKER ---
        const jobData = {
            ID_Annonce: `IMP_${Date.now()}`,
            Titre_poste: content.title,
            Entreprise: content.company,
            Lieu: content.location,
            Description: content.description,
            URL_offre: targetUrl,
            URL_Entreprise: '',
            Source: targetUrl.includes('linkedin.com') ? 'Linkedin' : 'Import',
            Type_contrat: content.contract,
            Salaire: content.salary,
            Date_Publication: new Date().toISOString(),
            Mot_cle_source: 'Import URL',
            Statut: 'Nouvelle',
            ownerId: userId,
            Date_Traitement: new Date().toISOString(),
            score_ATS: 0,
            remarque_ATS: "",
            data_ats: ""
        };

        const record = await pb.collection('jobs').create(jobData, { requestKey: null });
        console.log('Imported job saved:', record);
        return record;
    } catch (error) {
        console.error('Error importing from URL:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE (OPTIMISÉE)
// ═══════════════════════════════════════════════════════════════

/**
 * Recherche et importe des offres depuis les sources configurées
 * @param {string} userId - ID de l'utilisateur
 * @param {object} sources - Flags des sources { FT: bool, WTTJ: bool, RSS: bool }
 */
export async function searchJobs(userId, sources = { FT: true, WTTJ: true, RSS: false }) {
    try {
        console.time("GlobalSearch");
        console.log(`🚀 Starting Global Job Search for user: ${userId}`, sources);

        // 1. Charger Configs & Filtres
        const [allSearchConfigs, allFilters] = await Promise.all([
            pb.collection('config_search').getFullList({ filter: `ownerId = '${userId}'` }),
            pb.collection('config_filters').getFullList({ filter: `ownerId = '${userId}'` })
        ]);

        const searchConfigs = allSearchConfigs.filter(c => String(c.Actif).toUpperCase() === 'TRUE');
        const filters = allFilters.filter(f => String(f.Actif).toUpperCase() === 'TRUE');

        // Logic to parse consolidated "Type|Value" location into individual fields
        const REGION_MAP = {
            'Île-de-France': '11', 'Ile-de-France': '11',
            'Centre-Val de Loire': '24',
            'Bourgogne-Franche-Comté': '27',
            'Normandie': '28',
            'Hauts-de-France': '32',
            'Grand Est': '44',
            'Pays de la Loire': '52',
            'Bretagne': '53',
            'Nouvelle-Aquitaine': '75',
            'Occitanie': '76',
            'Auvergne-Rhône-Alpes': '84',
            'Provence-Alpes-Côte d\'Azur': '93', 'PACA': '93',
            'Corse': '94'
        };

        const REVERSE_REGION_MAP = Object.fromEntries(Object.entries(REGION_MAP).map(([k, v]) => [v, k]));

        searchConfigs.forEach(c => {
            if (c.Lieu && c.Lieu.includes('|')) {
                const [type, value] = c.Lieu.split('|');
                // FT mapping: commune, departement, region
                const ftMap = { 'Ville': 'commune', 'Departement': 'departement', 'Region': 'region' };
                c.Type_Lieu = ftMap[type] || 'commune';

                // Fix for Region: Ensure we send CODE, not Label
                if (c.Type_Lieu === 'region') {
                    // Check if value is a label (e.g. "Occitanie") -> Convert to "76"
                    if (isNaN(value) && REGION_MAP[value]) {
                        c.Code_Lieu = REGION_MAP[value];
                        console.log(`📍 Resolved Region Label "${value}" to Code "${c.Code_Lieu}"`);
                    } else {
                        // Assume it's already a code or invalid
                        c.Code_Lieu = value;
                    }
                } else {
                    c.Code_Lieu = value;
                }

            } else if (c.Lieu === 'France') {
                c.Type_Lieu = null;
                c.Code_Lieu = null;
            }
            // Ensure Rayon is Km for searchFranceTravail
            c.Km = c.Rayon;
        });

        if (searchConfigs.length === 0) return { success: false, message: 'Aucune recherche active configurée' };

        let stats = {
            totalNew: 0,
            processed: 0,
            errors: 0,
            details: [], // { source, keyword, count, new }
            topJobs: []
        };

        // Token FT (Need it only if source includes FT)
        let tokenFC = null;
        if (sources.FT) {
            try {
                tokenFC = await getFranceTravailToken();
            } catch (e) {
                console.error("Failed to get FT token", e);
            }
        }

        // 2. Pré-chargement des IDs existants (Dédoublonnage Flash)
        console.time("FetchExistingIDs");
        const existingJobs = await pb.collection('jobs').getFullList({
            filter: `ownerId = '${userId}'`,
            fields: 'ID_Annonce,URL_offre',
            requestKey: null
        });
        const existingIds = new Set(existingJobs.map(j => j.ID_Annonce));
        const existingUrls = new Set(existingJobs.filter(j => j.URL_offre).map(j => j.URL_offre));
        console.timeEnd("FetchExistingIDs");

        let jobsToCreate = [];

        // 3. Boucle de Recherche
        for (const config of searchConfigs) {

            // FT ALIGNMENT: Resolve CP to INSEE if needed
            if (config.Type_Lieu === 'commune' && config.Code_Lieu && config.Code_Lieu.length === 5) {
                try {
                    const inseeRecord = await pb.collection('ref_insee').getFirstListItem(`cp = "${config.Code_Lieu}"`, { fields: 'code' });
                    if (inseeRecord) {
                        config.Code_Lieu = inseeRecord.code;
                        console.log(`📍 Resolved CP ${config.Code_Lieu} to INSEE ${inseeRecord.code}`);
                    }
                } catch (e) {
                    console.warn(`⚠️ Could not resolve INSEE for CP ${config.Code_Lieu}, using CP as is.`);
                }
            }

            // --- FRANCE TRAVAIL ---
            if (sources.FT && tokenFC) {
                let ftCount = 0;
                let ftNew = 0;
                try {
                    const rawJobsFT = await searchFranceTravail(config, tokenFC);
                    // LIMIT 50 Latest
                    const slicedFT = rawJobsFT.slice(0, 50);

                    for (const rawJob of slicedFT) {
                        try {
                            ftCount++;
                            stats.processed++;
                            const idAnnonce = `FT_${rawJob.id}`;
                            const urlOffre = rawJob.origineOffre?.urlOrigine;

                            if (existingIds.has(idAnnonce) || (urlOffre && existingUrls.has(urlOffre))) {
                                continue;
                            }

                            const normalized = normalizeFT(rawJob, config.Mot_Cle, userId);
                            const scoring = calculateScore(normalized, filters);

                            if (!scoring) {
                                continue;
                            }

                            const jobWithScore = { ...normalized, ...scoring };
                            jobsToCreate.push(jobWithScore);
                            existingIds.add(idAnnonce);
                            if (urlOffre) existingUrls.add(urlOffre);
                            ftNew++;
                        } catch (innerErr) {
                            console.error(`Skipping FT Job ${rawJob.id}:`, innerErr);
                            stats.errors++;
                        }
                    }
                    if (ftNew > 0) {
                        stats.details.push({ source: 'France Travail', keyword: config.Mot_Cle, count: ftCount, new: ftNew });
                    }
                } catch (err) {
                    console.error(`❌ FT Error "${config.Mot_Cle}":`, err.message);
                    stats.errors++;
                }
            }

            // --- WELCOME TO THE JUNGLE (ALGOLIA) ---
            if (sources.WTTJ) {
                let wttjCount = 0;
                let wttjNew = 0;
                try {
                    const rawJobsWTTJ = await searchWTTJ(config);
                    // LIMIT 50 Latest (Assuming API returned 50, but ensuring safety)
                    const slicedWTTJ = rawJobsWTTJ.slice(0, 50);

                    for (const rawJob of slicedWTTJ) {
                        try {
                            wttjCount++;
                            stats.processed++;
                            const idAnnonce = `WTTJ_${rawJob.objectID}`;
                            const orgSlug = rawJob.organization?.slug || rawJob.company?.slug || 'unknown';
                            const jobSlug = rawJob.slug || 'unknown';
                            const urlOffre = `https://www.welcometothejungle.com/fr/companies/${orgSlug}/jobs/${jobSlug}`;

                            if (existingIds.has(idAnnonce) || (urlOffre && existingUrls.has(urlOffre))) {
                                continue;
                            }

                            const normalized = normalizeWTTJ(rawJob, config.Mot_Cle, userId);
                            const scoring = calculateScore(normalized, filters);

                            if (!scoring) {
                                continue;
                            }

                            const jobWithScore = { ...normalized, ...scoring };
                            jobsToCreate.push(jobWithScore);
                            existingIds.add(idAnnonce);
                            if (urlOffre) existingUrls.add(urlOffre);
                            wttjNew++;
                        } catch (innerErr) {
                            console.error(`Skipping WTTJ Job ${rawJob.objectID}:`, innerErr);
                            stats.errors++;
                        }
                    }
                    if (wttjNew > 0) {
                        stats.details.push({ source: 'WTTJ', keyword: config.Mot_Cle, count: wttjCount, new: wttjNew });
                    }
                } catch (err) {
                    console.error(`❌ WTTJ Error "${config.Mot_Cle}":`, err.message);
                    stats.errors++;
                }
            }
        }

        // --- RSS (Global, not per keyword) ---
        if (sources.RSS) {
            console.log("RSS Source selected - Native RSS parsing not fully implemented.");
        }

        // 4. Insertion Batch
        console.log(`📥 Inserting ${jobsToCreate.length} new jobs...`);
        console.time("BatchInsert");

        const BATCH_SIZE = 50;
        let successCount = 0;

        for (let i = 0; i < jobsToCreate.length; i += BATCH_SIZE) {
            const batch = jobsToCreate.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (job) => {
                try {
                    await pb.collection('jobs').create(job, { requestKey: null });
                    successCount++;
                } catch (err) {
                    if (err.status !== 400) console.error(`Insert Error ${job.ID_Annonce}:`, err);
                }
            }));

            if (i + BATCH_SIZE < jobsToCreate.length) await new Promise(r => setTimeout(r, 10));
        }

        stats.totalNew = successCount;

        // Prepare Top 5 for Popup
        stats.topJobs = jobsToCreate
            .sort((a, b) => b.score_interne - a.score_interne)
            .slice(0, 5)
            .map(j => ({
                title: j.Titre_poste,
                company: j.Entreprise,
                score: j.score_interne,
                url: j.URL_offre
            }));

        console.timeEnd("BatchInsert");
        console.timeEnd("GlobalSearch");

        return { success: true, stats };

    } catch (error) {
        console.error("Global Search Fatal Error:", error);
        return { success: false, message: error.message };
    }
}

export { importJobFromUrl };
